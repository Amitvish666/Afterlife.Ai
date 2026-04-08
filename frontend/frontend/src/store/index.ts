import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  created_at: string;
  consent_given: boolean;
  retention_period: number;
}

export interface Persona {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  relation?: string;
  purpose?: string;
  status: string;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
  voice_id?: string;
  memory_count: number;
  last_interaction?: string;
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
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  audio_url?: string;
  avatar_url?: string;
  created_at: string;
  tokens_used?: number;
}

// Auth Store
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Persona Store with localStorage persistence
interface PersonaState {
  personas: Persona[];
  tasks: Task[];
  currentPersona: Persona | null;
  isLoading: boolean;
  setPersonas: (personas: Persona[]) => void;
  setCurrentPersona: (persona: Persona | null) => void;
  addPersona: (persona: Persona) => void;
  updatePersona: (id: string, data: Partial<Persona>) => void;
  removePersona: (id: string) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  removeTask: (id: string) => void;
  getTasksForPersona: (personaId: string) => Task[];
}

const defaultPersonas: Persona[] = [];

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set, get) => ({
      personas: [],
      tasks: [],
      currentPersona: null,
      isLoading: false,
      setPersonas: (personas) => set({ personas }),
      setCurrentPersona: (persona) => set({ currentPersona: persona }),
      addPersona: (persona) => set((state) => ({ personas: [...state.personas, persona] })),
      updatePersona: (id, data) =>
        set((state) => ({
          personas: state.personas.map((p) => (p.id === id ? { ...p, ...data } : p)),
          currentPersona:
            state.currentPersona?.id === id ? { ...state.currentPersona, ...data } : state.currentPersona,
        })),
      removePersona: (id) =>
        set((state) => {
          const newPersonas = state.personas.filter((p) => p.id !== id);
          const newCurrentPersona = state.currentPersona?.id === id ? null : state.currentPersona;
          const newTasks = state.tasks.filter((t) => t.persona_id !== id);
          
          console.log('Removing persona:', id);
          console.log('Remaining tasks:', newTasks.length);
          
          return {
            personas: newPersonas,
            currentPersona: newCurrentPersona,
            tasks: newTasks,
          };
        }),
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (id, data) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
        })),
      removeTask: (id) => set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
      getTasksForPersona: (personaId) => get().tasks.filter((t) => t.persona_id === personaId),
    }),
    {
      name: 'persona-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        personas: state.personas, 
        tasks: state.tasks,
        currentPersona: state.currentPersona
      }),
    }
  )
);

// Chat Store
interface ChatState {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  isTyping: boolean;
  setSessions: (sessions: ChatSession[]) => void;
  setCurrentSession: (session: ChatSession | null) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setTyping: (typing: boolean) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      sessions: [],
      currentSession: null,
      messages: [],
      isTyping: false,
      setSessions: (sessions) => set({ sessions }),
      setCurrentSession: (session) => set({ currentSession: session, messages: [] }),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      setMessages: (messages) => set({ messages }),
      setTyping: (isTyping) => set({ isTyping }),
      clearChat: () => set({ currentSession: null, messages: [] }),
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// UI Store
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  audioEnabled: boolean;
  avatarEnabled: boolean;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setAudioEnabled: (enabled: boolean) => void;
  setAvatarEnabled: (enabled: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'dark',
      audioEnabled: true,
      avatarEnabled: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),
      setAvatarEnabled: (enabled) => set({ avatarEnabled: enabled }),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Upload Store
interface UploadProgress {
  progress: number;
  status: string;
}

interface UploadState {
  uploads: Record<string, UploadProgress>;
  addUpload: (id: string, progress: number, status: string) => void;
  updateUpload: (id: string, progress: number, status: string) => void;
  removeUpload: (id: string) => void;
  clearUploads: () => void;
}

export const useUploadStore = create<UploadState>()(
  persist(
    (set) => ({
      uploads: {},
      addUpload: (id, progress, status) =>
        set((state) => ({
          uploads: { ...state.uploads, [id]: { progress, status } },
        })),
      updateUpload: (id, progress, status) =>
        set((state) => ({
          uploads: {
            ...state.uploads,
            [id]: { progress, status },
          },
        })),
      removeUpload: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.uploads;
          return { uploads: rest };
        }),
      clearUploads: () => set({ uploads: {} }),
    }),
    {
      name: 'upload-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
