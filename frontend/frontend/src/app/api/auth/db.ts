// ============================================================
// Supabase-backed persistent database layer
// Replaces local file-based db.json — works on Vercel + local
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton client (server-side only usage)
function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('[DB] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
  }
  return createClient(supabaseUrl, supabaseKey);
}

// ============================================================
// Type Definitions
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

export interface Persona {
  id: string;
  user_id: string;
  title: string;
  description: string;
  relation: string;
  purpose: string;
  status: string;
  avatar_url?: string;
  created_at: string;
  tasks?: Task[];
}

export interface Task {
  id: string;
  persona_id: string;
  type: string;
  status: string;
  progress: number;
  result?: any;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  persona_id: string;
  user_id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface Memory {
  id: string;
  persona_id: string;
  content: string;
  type: string;
  importance: number;
  created_at: string;
}

// ============================================================
// Password helpers
// ============================================================

export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return hashPassword(plain) === hashed;
}

// ============================================================
// Map DB row → app types (snake_case → camelCase where needed)
// ============================================================

function rowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

function rowToPersona(row: any): Persona {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description || '',
    relation: row.relation,
    purpose: row.purpose,
    status: row.status,
    avatar_url: row.avatar_url,
    created_at: row.created_at,
  };
}

function rowToTask(row: any): Task {
  return {
    id: row.id,
    persona_id: row.persona_id,
    type: row.type,
    status: row.status,
    progress: row.progress,
    result: row.result,
    error: row.error,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToSession(row: any): ChatSession {
  return {
    id: row.id,
    persona_id: row.persona_id,
    user_id: row.user_id,
    title: row.title,
    message_count: row.message_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToMemory(row: any): Memory {
  return {
    id: row.id,
    persona_id: row.persona_id,
    content: row.content,
    type: row.type,
    importance: row.importance,
    created_at: row.created_at,
  };
}

// ============================================================
// User Operations
// ============================================================

export async function getUserByEmail(email: string): Promise<User | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('app_users')
    .select('*')
    .eq('email', email)
    .single();
  if (error || !data) return null;
  return rowToUser(data);
}

export async function getUserById(id: string): Promise<User | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('app_users')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return rowToUser(data);
}

export async function createUser(user: User): Promise<User> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('app_users')
    .insert({
      id: user.id,
      email: user.email,
      name: user.name,
      password_hash: user.passwordHash,
      created_at: user.createdAt,
    })
    .select()
    .single();
  if (error) throw new Error(`[DB] createUser failed: ${error.message}`);
  return rowToUser(data);
}

export async function userExistsByEmail(email: string): Promise<boolean> {
  const sb = getSupabase();
  const { count, error } = await sb
    .from('app_users')
    .select('id', { count: 'exact', head: true })
    .eq('email', email);
  return !error && (count ?? 0) > 0;
}

// ============================================================
// Persona Operations
// ============================================================

export async function getPersonasByUser(userId: string): Promise<Persona[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('personas')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[DB] getPersonasByUser:', error.message);
    return [];
  }
  return (data || []).map(rowToPersona);
}

export async function getPersonaById(id: string): Promise<Persona | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('personas')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return rowToPersona(data);
}

export async function addPersona(persona: Persona): Promise<Persona> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('personas')
    .insert({
      id: persona.id,
      user_id: persona.user_id,
      title: persona.title,
      description: persona.description,
      relation: persona.relation,
      purpose: persona.purpose,
      status: persona.status,
      avatar_url: persona.avatar_url,
      created_at: persona.created_at,
    })
    .select()
    .single();
  if (error) throw new Error(`[DB] addPersona failed: ${error.message}`);
  return rowToPersona(data);
}

export async function deletePersona(personaId: string): Promise<boolean> {
  const sb = getSupabase();
  const { error } = await sb.from('personas').delete().eq('id', personaId);
  if (error) {
    console.error('[DB] deletePersona:', error.message);
    return false;
  }
  return true;
}

// ============================================================
// Task Operations
// ============================================================

export async function getTasksForPersona(personaId: string): Promise<Task[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('tasks')
    .select('*')
    .eq('persona_id', personaId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[DB] getTasksForPersona:', error.message);
    return [];
  }
  return (data || []).map(rowToTask);
}

export async function addTask(task: Task): Promise<Task> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('tasks')
    .insert({
      id: task.id,
      persona_id: task.persona_id,
      type: task.type,
      status: task.status,
      progress: task.progress,
      result: task.result || null,
      error: task.error || null,
      created_at: task.created_at,
      updated_at: task.updated_at,
    })
    .select()
    .single();
  if (error) throw new Error(`[DB] addTask failed: ${error.message}`);
  return rowToTask(data);
}

export async function updateTask(
  taskId: string,
  updates: Partial<Task>
): Promise<Task | null> {
  const sb = getSupabase();
  const updatePayload: any = { updated_at: new Date().toISOString() };
  if (updates.status !== undefined) updatePayload.status = updates.status;
  if (updates.progress !== undefined) updatePayload.progress = updates.progress;
  if (updates.result !== undefined) updatePayload.result = updates.result;
  if (updates.error !== undefined) updatePayload.error = updates.error;
  if (updates.type !== undefined) updatePayload.type = updates.type;

  const { data, error } = await sb
    .from('tasks')
    .update(updatePayload)
    .eq('id', taskId)
    .select()
    .single();
  if (error) {
    console.error('[DB] updateTask:', error.message);
    return null;
  }
  return rowToTask(data);
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const sb = getSupabase();
  const { error } = await sb.from('tasks').delete().eq('id', taskId);
  if (error) {
    console.error('[DB] deleteTask:', error.message);
    return false;
  }
  return true;
}

// ============================================================
// Chat Session Operations
// ============================================================

export async function getSessionsForPersona(personaId: string, userId: string): Promise<ChatSession[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('chat_sessions')
    .select('*')
    .eq('persona_id', personaId)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('[DB] getSessionsForPersona:', error.message);
    return [];
  }
  return (data || []).map(rowToSession);
}

export async function getSessionById(sessionId: string): Promise<ChatSession | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  if (error || !data) return null;
  return rowToSession(data);
}

export async function findOrCreateSession(
  personaId: string,
  userId: string
): Promise<ChatSession> {
  const sb = getSupabase();
  // Look for existing "New Chat" session
  const { data: existing } = await sb
    .from('chat_sessions')
    .select('*')
    .eq('persona_id', personaId)
    .eq('user_id', userId)
    .eq('title', 'New Chat')
    .single();

  if (existing) return rowToSession(existing);

  // Create new session
  const newSession = {
    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
    persona_id: personaId,
    user_id: userId,
    title: 'New Chat',
    message_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await sb
    .from('chat_sessions')
    .insert(newSession)
    .select()
    .single();
  if (error) throw new Error(`[DB] findOrCreateSession failed: ${error.message}`);
  return rowToSession(data);
}

export async function addSession(session: ChatSession): Promise<ChatSession> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('chat_sessions')
    .insert({
      id: session.id,
      persona_id: session.persona_id,
      user_id: session.user_id,
      title: session.title,
      message_count: session.message_count,
      created_at: session.created_at,
      updated_at: session.updated_at,
    })
    .select()
    .single();
  if (error) throw new Error(`[DB] addSession failed: ${error.message}`);
  return rowToSession(data);
}

export async function incrementSessionMessages(sessionId: string): Promise<void> {
  const sb = getSupabase();
  try {
    const { data } = await sb
      .from('chat_sessions')
      .select('message_count')
      .eq('id', sessionId)
      .single();
    if (data) {
      await sb.from('chat_sessions').update({
        message_count: (data.message_count || 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq('id', sessionId);
    }
  } catch {
    // ignore increment errors silently
  }
}

export async function updateSession(
  sessionId: string,
  updates: Partial<ChatSession>
): Promise<void> {
  const sb = getSupabase();
  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.message_count !== undefined) payload.message_count = updates.message_count;
  if (updates.title !== undefined) payload.title = updates.title;
  await sb.from('chat_sessions').update(payload).eq('id', sessionId);
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const sb = getSupabase();
  const { error } = await sb
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId);
  if (error) {
    console.error('[DB] deleteSession:', error.message);
    return false;
  }
  return true;
}

// ============================================================
// Memory Operations
// ============================================================

export async function getMemoriesForPersona(personaId: string): Promise<Memory[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('memories')
    .select('*')
    .eq('persona_id', personaId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[DB] getMemoriesForPersona:', error.message);
    return [];
  }
  return (data || []).map(rowToMemory);
}

export async function addMemory(memory: Memory): Promise<Memory> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('memories')
    .insert({
      id: memory.id,
      persona_id: memory.persona_id,
      content: memory.content,
      type: memory.type,
      importance: memory.importance,
      created_at: memory.created_at,
    })
    .select()
    .single();
  if (error) throw new Error(`[DB] addMemory failed: ${error.message}`);
  return rowToMemory(data);
}

export async function deleteMemory(memoryId: string): Promise<boolean> {
  const sb = getSupabase();
  const { error } = await sb.from('memories').delete().eq('id', memoryId);
  if (error) {
    console.error('[DB] deleteMemory:', error.message);
    return false;
  }
  return true;
}

// ============================================================
// Legacy compatibility shim
// Some routes still call persistData() — make it a no-op
// ============================================================
export function persistData(): void {
  // No-op: Supabase writes are immediate
}

// Legacy in-memory refs used by old code — no longer needed
// kept as empty objects to avoid import errors during migration
export const usersDb: Record<string, any> = {};
export const personasDb: Record<string, any> = {};
export const tasksDb: Record<string, any> = {};
export const sessionsDb: Record<string, any> = {};
export const memoriesDb: Record<string, any> = {};
