import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { sessionsDb, personasDb, getMemoriesForPersona, persistData, addSession } from '../../../../../auth/db';

const SECRET_KEY = 'your-secret-key-change-in-production';

// Helper to get Ollama configuration
function getOllamaConfig(): { baseUrl: string; model: string } {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.2'
  };
}

function verifyToken(request: NextRequest): { userId: string; email: string } | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as { sub: string; email: string };
    return { userId: decoded.sub, email: decoded.email };
  } catch {
    return null;
  }
}

// Get AI response from Ollama
async function getAIResponse(
  message: string,
  history: { role: string; content: string }[],
  persona: any,
  memories: any[],
  language: string = 'en'
): Promise<{ content: string; provider: string } | null> {
  const { baseUrl, model } = getOllamaConfig();
  
  console.log('[AI] Ollama config - baseUrl:', baseUrl, 'model:', model);

  // Language-specific instruction - VERY STRONG
  let languageInstruction = '';
  if (language === 'hi') {
    languageInstruction = '\n\nIMPORTANT: You MUST respond ONLY in Hindi (हिंदी). Write every single word in Hindi. Do NOT write anything in English or Marathi. Start your response NOW in Hindi.';
  } else if (language === 'mr') {
    languageInstruction = '\n\nIMPORTANT: You MUST respond ONLY in Marathi (मराठी). Write every single word in Marathi script. Do NOT write anything in English or Hindi. Use ONLY Marathi characters. Start your response NOW in Marathi.';
  } else {
    languageInstruction = '\n\nIMPORTANT: You MUST respond ONLY in English. Write everything in English.';
  }

  // Build system prompt with persona info
  let systemPrompt = `You are ${persona.title}, a ${persona.relation || 'loved one'}.  
${persona.description ? `About them: ${persona.description}` : ''}

You are warm, loving, and conversational. Key traits:
- Be yourself, don't sound like an AI
- Show genuine care and affection
- Keep responses VERY SHORT - just 1-2 sentences like talking to family
- NEVER explain what you mean, just say it naturally
- Never say you're an AI or bot
- Never break down or explain your response${languageInstruction}

Remember: You are talking to someone you care about. Be present and loving.`;

  // Add memories context
  if (memories.length > 0) {
    const memoryTexts = memories.map(m => m.content);
    systemPrompt += `\n\nShared memories:\n${memoryTexts.join('\n')}`;
  }

  // Build conversation
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(msg => ({ role: msg.role, content: msg.content }))
  ];

  try {
    console.log('[AI] Calling Ollama API at:', baseUrl);
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages,
        stream: false
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[AI] Ollama response received successfully');
      return { content: data.message?.content || '', provider: 'ollama' };
    } else {
      const errorText = await response.text();
      console.error('[AI] Ollama API error:', response.status, errorText);
    }
  } catch (error) {
    console.error('[AI] Ollama API exception:', error);
  }

  return null;
}

// POST - Send a message (creates new session if doesn't exist)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const personaId = params.id;
    const body = await request.json();
    const { message, conversation_history = [], language = 'en', persona: personaFromBody, memories: memoriesFromBody = [] } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'Message is required' } },
        { status: 400 }
      );
    }

    // Use persona from request body or fallback to in-memory db
    let persona = personaFromBody;
    if (!persona) {
      persona = personasDb[personaId];
    }
    
    if (!persona) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Persona not found' } },
        { status: 404 }
      );
    }

    // Get memories from request body or in-memory db
    const memories = memoriesFromBody.length > 0 
      ? memoriesFromBody 
      : getMemoriesForPersona(personaId);

    // Find or create session
    let sessionId: string | null = null;
    let existingSession: any = null;

    for (const [id, sessionObj] of Object.entries(sessionsDb)) {
      const s = sessionObj as any;
      if (s.persona_id === personaId && s.user_id === user.userId && s.title === 'New Chat') {
        sessionId = id;
        existingSession = s;
        break;
      }
    }

    if (!sessionId) {
      const newSessionId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
      const newSession = {
        id: newSessionId,
        persona_id: personaId,
        user_id: user.userId,
        title: 'New Chat',
        message_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      addSession(newSession);
      sessionId = newSessionId;
    } else if (existingSession) {
      existingSession.message_count += 1;
      existingSession.updated_at = new Date().toISOString();
      sessionsDb[sessionId] = existingSession;
      persistData();
    }

    // Try to get AI response
    const history = [...conversation_history, { role: 'user', content: message }];
    const aiResponse = await getAIResponse(message, history, persona, memories, language);

    // Return error if AI fails
    if (!aiResponse) {
      console.error('[AI] Ollama API failed to respond');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AI_SERVICE_UNAVAILABLE',
            message: 'Ollama service is unavailable. Make sure Ollama is running on your computer.'
          }
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      response: aiResponse.content,
      conversation_id: sessionId,
      tokens_used: Math.floor((message.length + aiResponse.content.length) / 4),
      source: aiResponse.provider,
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to send message' } },
      { status: 500 }
    );
  }
}
