// Shared in-memory storage for auth with localStorage persistence
// In production, this would be replaced with a proper database

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

const STORAGE_KEYS = {
  users: 'beyondlife_users',
  personas: 'beyondlife_personas',
  tasks: 'beyondlife_tasks',
  sessions: 'beyondlife_sessions',
};

// Helper functions for localStorage persistence
function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

// Initialize storage with some demo data if empty
function initializeStorage() {
  if (typeof window === 'undefined') return;
  
  // Check if already initialized
  if (localStorage.getItem('beyondlife_initialized')) return;
  
  // Create demo user
  const demoUser: User = {
    id: 'demo-user-1',
    email: 'demo@example.com',
    name: 'Demo User',
    passwordHash: hashPassword('demo123'),
    createdAt: new Date().toISOString(),
  };
  
  const users = loadFromStorage<Record<string, User>>(STORAGE_KEYS.users, {});
  users[demoUser.id] = demoUser;
  saveToStorage(STORAGE_KEYS.users, users);
  
  // Mark as initialized
  localStorage.setItem('beyondlife_initialized', 'true');
}

// Initialize on load
initializeStorage();

// In-memory storage with localStorage backup
export const usersDb: Record<string, User> = loadFromStorage(STORAGE_KEYS.users, {});
export const personasDb: Record<string, Persona> = loadFromStorage(STORAGE_KEYS.personas, {});
export const tasksDb: Record<string, Task> = loadFromStorage(STORAGE_KEYS.tasks, {});
export const sessionsDb: Record<string, ChatSession> = loadFromStorage(STORAGE_KEYS.sessions, {});

// Auto-save to localStorage whenever data changes
function saveAll() {
  saveToStorage(STORAGE_KEYS.users, usersDb);
  saveToStorage(STORAGE_KEYS.personas, personasDb);
  saveToStorage(STORAGE_KEYS.tasks, tasksDb);
  saveToStorage(STORAGE_KEYS.sessions, sessionsDb);
}

// Export save function to be called after mutations
export function persistData() {
  saveAll();
}

// Helper to add persona with persistence
export function addPersona(persona: Persona): Persona {
  personasDb[persona.id] = persona;
  saveToStorage(STORAGE_KEYS.personas, personasDb);
  return persona;
}

// Helper to delete persona with persistence
export function deletePersona(personaId: string): boolean {
  if (!personasDb[personaId]) return false;
  delete personasDb[personaId];
  
  // Also delete associated tasks
  Object.keys(tasksDb).forEach(taskId => {
    if (tasksDb[taskId].persona_id === personaId) {
      delete tasksDb[taskId];
    }
  });
  
  saveToStorage(STORAGE_KEYS.personas, personasDb);
  saveToStorage(STORAGE_KEYS.tasks, tasksDb);
  return true;
}

// Helper to add task with persistence
export function addTask(task: Task): Task {
  tasksDb[task.id] = task;
  saveToStorage(STORAGE_KEYS.tasks, tasksDb);
  return task;
}

// Helper to update task with persistence
export function updateTask(taskId: string, updates: Partial<Task>): Task | null {
  if (!tasksDb[taskId]) return null;
  tasksDb[taskId] = { ...tasksDb[taskId], ...updates, updated_at: new Date().toISOString() };
  saveToStorage(STORAGE_KEYS.tasks, tasksDb);
  return tasksDb[taskId];
}

// Helper to delete task with persistence
export function deleteTask(taskId: string): boolean {
  if (!tasksDb[taskId]) return false;
  delete tasksDb[taskId];
  saveToStorage(STORAGE_KEYS.tasks, tasksDb);
  return true;
}

// Helper to get tasks for a persona
export function getTasksForPersona(personaId: string): Task[] {
  return Object.values(tasksDb).filter(task => task.persona_id === personaId);
}

// Helper to add session with persistence
export function addSession(session: ChatSession): ChatSession {
  sessionsDb[session.id] = session;
  saveToStorage(STORAGE_KEYS.sessions, sessionsDb);
  return session;
}

// Helper to delete session with persistence
export function deleteSession(sessionId: string): boolean {
  if (!sessionsDb[sessionId]) return false;
  delete sessionsDb[sessionId];
  saveToStorage(STORAGE_KEYS.sessions, sessionsDb);
  return true;
}

// Helper to get sessions for a persona
export function getSessionsForPersona(personaId: string): ChatSession[] {
  return Object.values(sessionsDb).filter(session => session.persona_id === personaId);
}

export function hashPassword(password: string): string {
  // Simple hash for testing
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
