import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const SECRET_KEY = 'your-secret-key-change-in-production';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface SessionRecord {
  [key: string]: {
    id: string;
    persona_id: string;
    user_id: string;
    title: string;
    message_count: number;
    created_at: string;
    updated_at: string;
  };
}

interface PersonaRecord {
  [key: string]: {
    id: string;
    user_id: string;
    title: string;
    description: string;
    relation: string;
    purpose: string;
    status: string;
    avatar_url?: string;
    created_at: string;
  };
}

interface MemoryRecord {
  [key: string]: {
    id: string;
    persona_id: string;
    content: string;
    type: string;
    importance: number;
    created_at: string;
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

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// Get AI response from OpenAI
async function getAIResponse(
  message: string,
  history: { role: string; content: string }[],
  persona: PersonaRecord[string],
  memories: MemoryRecord[string][],
  language: string = 'en'
): Promise<string | null> {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 10) {
    console.log('[AI] OpenAI API key not configured or invalid');
    return null;
  }

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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages,
        max_tokens: 500,
        temperature: 0.8
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices[0]?.message?.content || null;
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
  }

  return null;
}

// POST - Send a message to an existing session
export async function POST(request: NextRequest, { params }: { params: { id: string; sessionId: string } }) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id: personaId, sessionId } = params;
    const body = await request.json();
    const { message, conversation_history = [], language = 'en' } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'Message is required' } },
        { status: 400 }
      );
    }

    // Load data from localStorage
    const sessionsDb = loadFromStorage<SessionRecord>('beyondlife_sessions', {});
    const personasDb = loadFromStorage<PersonaRecord>('beyondlife_personas', {});
    const memoriesDb = loadFromStorage<Record<string, MemoryRecord[string]>>('beyondlife_memories', {});

    // Check if session exists and belongs to user
    const session = sessionsDb[sessionId];
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } },
        { status: 404 }
      );
    }

    if (session.user_id !== user.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not authorized' } },
        { status: 403 }
      );
    }

    // Get persona info
    const persona = personasDb[personaId];
    if (!persona) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Persona not found' } },
        { status: 404 }
      );
    }

    // Get memories for this persona
    const memories = Object.values(memoriesDb).filter(m => m.persona_id === personaId);

    // Update session
    session.message_count += 1;
    session.updated_at = new Date().toISOString();
    sessionsDb[sessionId] = session;
    if (typeof window !== 'undefined') {
      localStorage.setItem('beyondlife_sessions', JSON.stringify(sessionsDb));
    }

    // Try to get AI response
    const history = [...conversation_history, { role: 'user', content: message }];
    const aiResponse = await getAIResponse(message, history, persona, memories, language);

    // Return error if AI fails (no pre-defined fallback responses)
    if (!aiResponse) {
      console.error('[AI] OpenAI API failed to respond');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AI_SERVICE_UNAVAILABLE',
            message: 'AI chat service is currently unavailable. Please check your API keys in .env.local file and ensure they are valid.'
          }
        },
        { status: 503 }
      );
    }

    const response = aiResponse;

    return NextResponse.json({
      success: true,
      response,
      conversation_id: sessionId,
      tokens_used: Math.floor((message.length + response.length) / 4),
      source: 'ai',
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to send message' } },
      { status: 500 }
    );
  }
}
