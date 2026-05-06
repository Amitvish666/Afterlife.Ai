import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSessionsForPersona, addSession, type ChatSession } from '../../../auth/db';

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

// GET - List sessions for a persona
export async function GET(
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
    const sessions = await getSessionsForPersona(personaId, user.userId);

    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to get sessions' } },
      { status: 500 }
    );
  }
}

// POST - Create a new session
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
    const { title } = body;

    const session: ChatSession = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
      persona_id: personaId,
      user_id: user.userId,
      title: title || 'New Chat',
      message_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const created = await addSession(session);

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create session' } },
      { status: 500 }
    );
  }
}
