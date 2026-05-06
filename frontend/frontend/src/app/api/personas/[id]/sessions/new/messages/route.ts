import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { findOrCreateSession, getPersonaById, getMemoriesForPersona, updateSession } from '../../../../../auth/db';
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { message, conversation_history = [], language = 'en' } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'Message is required' } },
        { status: 400 }
      );
    }

    // Get or create session in Supabase
    const session = await findOrCreateSession(personaId, user.userId);

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

    // Increment session message count
    await updateSession(session.id, { message_count: (session.message_count || 0) + 1 });

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

    return NextResponse.json({
      success: true,
      response: cleanedContent,
      emotion,
      conversation_id: session.id,
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
