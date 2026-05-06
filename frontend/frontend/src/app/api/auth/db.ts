// Server-side in-memory storage with file-based persistence
// localStorage is not available in Next.js API routes (server-side)

import fs from 'fs';
import path from 'path';

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

// Use a writable data directory inside the project
const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DbData {
  users: Record<string, User>;
  personas: Record<string, Persona>;
  tasks: Record<string, Task>;
  sessions: Record<string, ChatSession>;
  memories: Record<string, Memory>;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadDb(): DbData {
  ensureDataDir();
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('[DB] Failed to load db.json, starting fresh:', e);
  }
  return { users: {}, personas: {}, tasks: {}, sessions: {}, memories: {} };
}

function saveDb(data: DbData) {
  ensureDataDir();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('[DB] Failed to save db.json:', e);
  }
}

// Load once at module init (shared across hot-reloads via module cache)
const _db: DbData = loadDb();

export const usersDb: Record<string, User> = _db.users;
export const personasDb: Record<string, Persona> = _db.personas;
export const tasksDb: Record<string, Task> = _db.tasks;
export const sessionsDb: Record<string, ChatSession> = _db.sessions;
export const memoriesDb: Record<string, Memory> = _db.memories;

export function persistData() {
  saveDb({ users: usersDb, personas: personasDb, tasks: tasksDb, sessions: sessionsDb, memories: memoriesDb });
}

// Persona helpers
export function addPersona(persona: Persona): Persona {
  personasDb[persona.id] = persona;
  persistData();
  return persona;
}

export function deletePersona(personaId: string): boolean {
  if (!personasDb[personaId]) return false;
  delete personasDb[personaId];
  Object.keys(tasksDb).forEach(taskId => {
    if (tasksDb[taskId].persona_id === personaId) delete tasksDb[taskId];
  });
  persistData();
  return true;
}

// Task helpers
export function addTask(task: Task): Task {
  tasksDb[task.id] = task;
  persistData();
  return task;
}

export function updateTask(taskId: string, updates: Partial<Task>): Task | null {
  if (!tasksDb[taskId]) return null;
  tasksDb[taskId] = { ...tasksDb[taskId], ...updates, updated_at: new Date().toISOString() };
  persistData();
  return tasksDb[taskId];
}

export function deleteTask(taskId: string): boolean {
  if (!tasksDb[taskId]) return false;
  delete tasksDb[taskId];
  persistData();
  return true;
}

export function getTasksForPersona(personaId: string): Task[] {
  return Object.values(tasksDb).filter(t => t.persona_id === personaId);
}

// Session helpers
export function addSession(session: ChatSession): ChatSession {
  sessionsDb[session.id] = session;
  persistData();
  return session;
}

export function deleteSession(sessionId: string): boolean {
  if (!sessionsDb[sessionId]) return false;
  delete sessionsDb[sessionId];
  persistData();
  return true;
}

export function getSessionsForPersona(personaId: string): ChatSession[] {
  return Object.values(sessionsDb).filter(s => s.persona_id === personaId);
}

// Memory helpers
export function addMemory(memory: Memory): Memory {
  memoriesDb[memory.id] = memory;
  persistData();
  return memory;
}

export function deleteMemory(memoryId: string): boolean {
  if (!memoriesDb[memoryId]) return false;
  delete memoriesDb[memoryId];
  persistData();
  return true;
}

export function getMemoriesForPersona(personaId: string): Memory[] {
  return Object.values(memoriesDb).filter(m => m.persona_id === personaId);
}

export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return hashPassword(plain) === hashed;
}
