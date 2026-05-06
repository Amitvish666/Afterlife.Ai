import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import {
  getPersonasByUser,
  addPersona,
  addTask,
  updateTask,
  deleteTask,
  getTasksForPersona,
  type Persona,
  type Task,
} from '../auth/db';

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

export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const userPersonas = await getPersonasByUser(user.userId);

    // Attach tasks for each persona
    const personasWithTasks = await Promise.all(
      userPersonas.map(async (persona) => ({
        ...persona,
        tasks: await getTasksForPersona(persona.id),
      }))
    );

    return NextResponse.json({ success: true, data: personasWithTasks });
  } catch (error) {
    console.error('Get personas error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to get personas' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, relation, purpose } = body;

    if (!title || !relation || !purpose) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_FIELDS', message: 'Title, relation, and purpose are required' } },
        { status: 400 }
      );
    }

    const persona: Persona = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
      user_id: user.userId,
      title,
      description: description || '',
      relation,
      purpose,
      status: 'ready',
      created_at: new Date().toISOString(),
    };

    const created = await addPersona(persona);

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error('Create persona error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create persona' } },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, persona_id, task_id, ...taskData } = body;

    if (action === 'createTask') {
      const task: Task = {
        id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
        persona_id,
        type: taskData.type || 'general',
        status: 'pending',
        progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const created = await addTask(task);
      return NextResponse.json({ success: true, data: created });
    }

    if (action === 'updateTask' && task_id) {
      const updated = await updateTask(task_id, taskData);
      if (!updated) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'deleteTask' && task_id) {
      await deleteTask(task_id);
      return NextResponse.json({ success: true, message: 'Task deleted successfully' });
    }

    if (action === 'getTasks' && persona_id) {
      const tasks = await getTasksForPersona(persona_id);
      return NextResponse.json({ success: true, data: tasks });
    }

    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ACTION', message: 'Invalid action' } },
      { status: 400 }
    );
  } catch (error) {
    console.error('Task operation error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to process task' } },
      { status: 500 }
    );
  }
}
