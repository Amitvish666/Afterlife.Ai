import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { personasDb, tasksDb, addPersona, addTask, getTasksForPersona, deleteTask, persistData, type Persona, type Task } from '../auth/db';

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

export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get user's personas with tasks
    const userPersonas = Object.values(personasDb)
      .filter(p => p.user_id === user.userId)
      .map(persona => ({
        ...persona,
        tasks: Object.values(tasksDb).filter(t => t.persona_id === persona.id),
      }));

    return NextResponse.json({
      success: true,
      data: userPersonas,
    });
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

    // Create persona with persistence
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

    addPersona(persona);

    return NextResponse.json({
      success: true,
      data: persona,
    });
  } catch (error) {
    console.error('Create persona error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create persona' } },
      { status: 500 }
    );
  }
}

// Task endpoints
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
      // Create a new task
      const task: Task = {
        id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
        persona_id,
        type: taskData.type || 'general',
        status: 'pending',
        progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      addTask(task);

      return NextResponse.json({
        success: true,
        data: task,
      });
    }

    if (action === 'updateTask' && task_id) {
      // Update task progress
      const existingTask = tasksDb[task_id];
      if (!existingTask) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } },
          { status: 404 }
        );
      }

      const updatedTask = { ...existingTask, ...taskData, updated_at: new Date().toISOString() };
      tasksDb[task_id] = updatedTask;
      persistData();

      return NextResponse.json({
        success: true,
        data: updatedTask,
      });
    }

    if (action === 'deleteTask' && task_id) {
      deleteTask(task_id);

      return NextResponse.json({
        success: true,
        message: 'Task deleted successfully',
      });
    }

    if (action === 'getTasks' && persona_id) {
      const personaTasks = getTasksForPersona(persona_id);

      return NextResponse.json({
        success: true,
        data: personaTasks,
      });
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
