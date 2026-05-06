import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const SECRET_KEY = 'your-secret-key-change-in-production';

// Helper to get Ollama configuration
function getOllamaConfig(): { baseUrl: string; model: string } {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.2'
  };
}

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

function loadFromStorage<T>(key: string): T {
  if (typeof window === 'undefined') return {} as T;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : ({} as T);
  } catch {
    return {} as T;
  }
}

// Get AI response from Ollama, with OpenAI fallback
async function getAIResponse(
  message: string,
  history: { role: string; content: string }[],
  persona: PersonaRecord[string],
  memories: MemoryRecord[string][],
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
      }),
      signal: AbortSignal.timeout(4000) // 4 seconds timeout for fast fallback
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

  // Fallback to OpenAI if Ollama fails/is unavailable and OPENAI_API_KEY is configured
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      console.log('[AI] Ollama unavailable. Falling back to OpenAI cloud AI...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages,
          max_tokens: 150
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        console.log('[AI] OpenAI fallback response received successfully');
        return { content, provider: 'openai' };
      } else {
        const errorText = await response.text();
        console.error('[AI] OpenAI fallback API error:', response.status, errorText);
      }
    } catch (openaiError) {
      console.error('[AI] OpenAI fallback API exception:', openaiError);
    }
  } else {
    console.log('[AI] No OPENAI_API_KEY found for fallback.');
  }

  return null;
}

// POST - Send a message (creates new session if doesn't exist)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    let user: { userId: string; email: string } | null = null;
    
    // Try to get user from localStorage (browser context)
    if (typeof window !== 'undefined') {
      try {
        const userStored = localStorage.getItem('auth-storage');
        if (userStored) {
          const userData = JSON.parse(userStored);
          if (userData?.state?.user) {
            user = { userId: userData.state.user.id, email: userData.state.user.email };
          }
        }
      } catch (e) {
        console.error('Error getting user from localStorage:', e);
      }
    }
    
    // Fall back to token verification (server context)
    if (!user) {
      user = verifyToken(request);
      if (!user) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
          { status: 401 }
        );
      }
    }

    const personaId = params.id;
    
    // Parse body safely
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      console.error('Failed to parse request body:', e);
    }
    
    const { message, conversation_history = [], language = 'en', persona: personaFromBody, memories: memoriesFromBody = [] } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'Message is required' } },
        { status: 400 }
      );
    }

    // Load sessions - handle both browser and server context
    let sessionsDb: SessionRecord = {};
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('beyondlife_sessions');
        sessionsDb = stored ? JSON.parse(stored) : {};
      } catch (e) {
        console.error('Error loading sessions:', e);
      }
    }

    // Use persona from request body or fallback to localStorage
    let persona = personaFromBody;
    
    if (!persona && typeof window !== 'undefined') {
      try {
        const personasStored = localStorage.getItem('beyondlife_personas');
        const personasDb: PersonaRecord = personasStored ? JSON.parse(personasStored) : {};
        persona = personasDb[personaId];
      } catch (e) {
        console.error('Error loading personas:', e);
      }
    }
    
    if (!persona) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Persona not found' } },
        { status: 404 }
      );
    }

    // Get memories
    let memories: MemoryRecord[string][] = [];
    if (memoriesFromBody.length > 0) {
      memories = memoriesFromBody;
    } else if (typeof window !== 'undefined') {
      try {
        const memoriesStored = localStorage.getItem('beyondlife_memories');
        const memoriesDb = memoriesStored ? JSON.parse(memoriesStored) : {};
        memories = Object.values(memoriesDb).filter((m: any) => m.persona_id === personaId) as any;
      } catch (e) {
        console.error('Error loading memories:', e);
      }
    }

    // Find or create session
    let sessionId: string | null = null;
    let existingSession: typeof sessionsDb[string] | null = null;

    for (const [id, s] of Object.entries(sessionsDb)) {
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
      sessionsDb[newSessionId] = newSession;
      sessionId = newSessionId;
    } else if (existingSession) {
      existingSession.message_count += 1;
      existingSession.updated_at = new Date().toISOString();
      sessionsDb[sessionId] = existingSession;
    }

    // Save sessions (browser context only)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('beyondlife_sessions', JSON.stringify(sessionsDb));
      } catch (e) {
        console.error('Error saving sessions:', e);
      }
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
