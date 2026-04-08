import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { sessionsDb, deleteSession, persistData } from '../../../../auth/db';

const SECRET_KEY = 'your-secret-key-change-in-production';

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

// DELETE - Delete a session
export async function DELETE(
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

    const session = sessionsDb[sessionId];
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } },
        { status: 404 }
      );
    }

    if (session.user_id !== user.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to delete this session' } },
        { status: 403 }
      );
    }

    deleteSession(sessionId);
    persistData();

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete session' } },
      { status: 500 }
    );
  }
}
