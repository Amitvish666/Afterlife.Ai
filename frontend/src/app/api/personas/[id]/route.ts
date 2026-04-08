import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { personasDb, deletePersona, persistData } from '../../auth/db';

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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  console.log('DELETE request received for persona:', params.id);
  try {
    const user = verifyToken(request);
    console.log('User verified:', user);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const personaId = params.id;
    console.log('Attempting to delete persona:', personaId);

    if (!personaId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'Persona ID is required' } },
        { status: 400 }
      );
    }

    // Verify ownership
    const persona = personasDb[personaId];
    console.log('Found persona:', persona);
    if (!persona) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Persona not found' } },
        { status: 404 }
      );
    }

    if (persona.user_id !== user.userId) {
      console.log('Ownership check failed: persona.user_id:', persona.user_id, 'user.userId:', user.userId);
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to delete this persona' } },
        { status: 403 }
      );
    }

    console.log('Deleting persona...');
    const deleted = deletePersona(personaId);
    console.log('Delete result:', deleted);
    persistData();
    console.log('Persona deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Persona deleted successfully',
    });
  } catch (error) {
    console.error('Delete persona error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete persona' } },
      { status: 500 }
    );
  }
}
