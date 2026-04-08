import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { sessionsDb, addSession, persistData } from '../../../auth/db';

const SECRET_KEY = 'your-secret-key-change-in-production';

// In-memory session storage
interface ChatSession {
  id: string;
  persona_id: string;
  user_id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
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

// GET - List sessions for a persona
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // For API routes, we need to check auth header
    // Try to get user from auth header first
    let user: { userId: string; email: string } | null = null;
    
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, SECRET_KEY) as { sub: string; email: string };
        user = { userId: decoded.sub, email: decoded.email };
      } catch (e) {
        console.error('Token verification failed:', e);
      }
    }
    
    // If no token from header, try browser localStorage (client-side)
    if (!user && typeof window !== 'undefined') {
      try {
        const userStored = localStorage.getItem('auth-storage');
        const userData = userStored ? JSON.parse(userStored) : null;
        if (userData?.state?.user) {
          user = { userId: userData.state.user.id, email: userData.state.user.email };
        }
      } catch (e) {
        console.error('Browser auth error:', e);
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const personaId = params.id;
    
    // Get sessions for this persona
    const sessions = Object.values(sessionsDb)
      .filter(s => s.persona_id === personaId && s.user_id === user.userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to get sessions' } },
      { status: 500 }
    );
  }
}

// POST - Create a new session
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    let user: { userId: string; email: string } | null = null;
    
    // For API routes, try auth header first
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, SECRET_KEY) as { sub: string; email: string };
        user = { userId: decoded.sub, email: decoded.email };
      } catch (e) {
        console.error('Token verification failed:', e);
      }
    }
    
    // If no token, try browser localStorage (client-side)
    if (!user && typeof window !== 'undefined') {
      try {
        const userStored = localStorage.getItem('auth-storage');
        const userData = userStored ? JSON.parse(userStored) : null;
        if (userData?.state?.user) {
          user = { userId: userData.state.user.id, email: userData.state.user.email };
        }
      } catch (e) {
        console.error('Browser auth error:', e);
      }
    }

    // Server-side token verification fallback
    if (!user) {
      const serverUser = verifyToken(request);
      if (!serverUser) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
          { status: 401 }
        );
      }
      user = serverUser;
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

    sessionsDb[session.id] = session;
    persistData();

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create session' } },
      { status: 500 }
    );
  }
}
