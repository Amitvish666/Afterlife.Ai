import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getPersonaById, deletePersona } from '../../auth/db';

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('DELETE request received for persona:', params.id);
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const personaId = params.id;
    if (!personaId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'Persona ID is required' } },
        { status: 400 }
      );
    }

    // Verify ownership via Supabase
    const persona = await getPersonaById(personaId);
    if (!persona) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Persona not found' } },
        { status: 404 }
      );
    }

    if (persona.user_id !== user.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to delete this persona' } },
        { status: 403 }
      );
    }

    const deleted = await deletePersona(personaId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete persona' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Persona deleted successfully' });
  } catch (error) {
    console.error('Delete persona error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete persona' } },
      { status: 500 }
    );
  }
}
