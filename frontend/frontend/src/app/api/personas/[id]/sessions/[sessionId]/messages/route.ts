import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { 
  getSessionById, 
  getPersonaById, 
  getMemoriesForPersona, 
  updateSession, 
  addMessage, 
  getMessagesForSession 
} from '../../../../../auth/db';
import { getAIResponse } from '../../../../../utils/ai';
import { cleanText, detectEmotion } from '../../../../../utils/text';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function verifyToken(request: NextRequest): { userId: string; email: string } | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as { sub: string; email: string };
    return { userId: decoded.sub, email: decoded.email };
  } catch {
    return null;
  }
}

// GET - Get message history for a session
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { sessionId } = params;
    
    // Verify session belongs to user
    const session = await getSessionById(sessionId);
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

    const messages = await getMessagesForSession(sessionId);

    return NextResponse.json({
      success: true,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.created_at
      }))
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch messages' } },
      { status: 500 }
    );
  }
}

// POST - Send a message to an existing session
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
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

    // Check if session exists in Supabase
    const session = await getSessionById(sessionId);
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

    // Save user message
    await addMessage({
      id: Math.random().toString(36).substring(2, 15),
      session_id: sessionId,
      role: 'user',
      content: message,
      created_at: new Date().toISOString()
    });

    // Get persona info from Supabase
    const persona = await getPersonaById(personaId);
    if (!persona) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Persona not found' } },
        { status: 404 }
      );
    }

    // Get memories from Supabase
    const memories = await getMemoriesForPersona(personaId);

    // Get AI response (Ollama only)
    const history = [...conversation_history, { role: 'user', content: message }];
    const aiResult = await getAIResponse(message, history, persona, memories, language);

    if (!aiResult) {
      console.error('[AI] Ollama service failed to respond');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AI_SERVICE_UNAVAILABLE',
            message: 'AI chat service is currently unavailable. Please ensure Ollama is running and reachable.',
          },
        },
        { status: 503 }
      );
    }

    const cleanedContent = cleanText(aiResult.content);
    const emotion = detectEmotion(aiResult.content);

    // Save assistant message
    await addMessage({
      id: Math.random().toString(36).substring(2, 15),
      session_id: sessionId,
      role: 'assistant',
      content: cleanedContent,
      created_at: new Date().toISOString()
    });

    // Update session message count and title if it's the first message
    const currentCount = (session.message_count || 0);
    const updates: any = { 
      message_count: currentCount + 2,
      updated_at: new Date().toISOString()
    };
    
    // Auto-title if it's still "New Chat"
    if (session.title === 'New Chat' || !session.title) {
      updates.title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
    }
    
    await updateSession(sessionId, updates);

    return NextResponse.json({
      success: true,
      response: cleanedContent,
      emotion,
      conversation_id: sessionId,
      tokens_used: Math.floor((message.length + cleanedContent.length) / 4),
      source: aiResult.provider,
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to send message' } },
      { status: 500 }
    );
  }
}
