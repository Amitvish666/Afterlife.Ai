-- =============================================
-- Afterlife AI - Supabase Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- Drop existing tables if re-running (order matters for FK constraints)
DROP TABLE IF EXISTS memories CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS personas CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;

-- Users table (custom auth, NOT Supabase Auth)
CREATE TABLE app_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personas table
CREATE TABLE personas (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  relation TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT DEFAULT 'ready',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat sessions table
CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  title TEXT DEFAULT 'New Chat',
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memories table
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  importance INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Disable RLS (using custom JWT auth, server-side only)
-- =============================================
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE personas DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE memories DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- =============================================
-- Performance indexes
-- =============================================
CREATE INDEX idx_personas_user_id ON personas(user_id);
CREATE INDEX idx_tasks_persona_id ON tasks(persona_id);
CREATE INDEX idx_chat_sessions_persona_id ON chat_sessions(persona_id);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_memories_persona_id ON memories(persona_id);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_app_users_email ON app_users(email);
