// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  created_at: string;
  consent_given: boolean;
  retention_period: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Persona Types
export interface Persona {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: PersonaStatus;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
  voice_id?: string;
  memory_count: number;
  last_interaction?: string;
}

export type PersonaStatus = 'processing' | 'ready' | 'error' | 'deleted';

export interface PersonaSummary {
  name: string;
  date_of_birth?: string;
  relationships: string[];
  key_facts: string[];
  personality_traits: string[];
  speech_patterns: string[];
  interests: string[];
  sample_responses: string[];
}

// Artifact Types
export interface Artifact {
  id: string;
  persona_id: string;
  file_type: ArtifactType;
  original_filename: string;
  s3_key: string;
  file_size: number;
  mime_type: string;
  status: ArtifactStatus;
  metadata: ArtifactMetadata;
  processed_text_id?: string;
  created_at: string;
}

export type ArtifactType = 'text' | 'audio' | 'video' | 'image';
export type ArtifactStatus = 'pending' | 'processing' | 'ready' | 'error';

export interface ArtifactMetadata {
  duration?: number;
  width?: number;
  height?: number;
  sample_rate?: number;
  channels?: number;
  language?: string;
  speakers?: string[];
  timestamp?: string;
  platform?: string;
  source?: string;
}

// Memory Types
export interface MemoryItem {
  id: string;
  persona_id: string;
  text: string;
  embedding?: number[];
  source: string;
  source_type: string;
  timestamp?: string;
  importance: number;
  category: MemoryCategory;
  created_at: string;
}

export type MemoryCategory = 
  | 'personal_fact'
  | 'relationship'
  | 'preference'
  | 'memory'
  | 'quote'
  | 'behavior'
  | 'opinion'
  | 'skill';

// Chat Types
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

export interface ChatRequest {
  session_id?: string;
  message: string;
  enable_voice: boolean;
  enable_avatar: boolean;
  temperature?: number;
}

export interface ChatResponse {
  message_id: string;
  session_id: string;
  content: string;
  audio_url?: string;
  avatar_video_url?: string;
  tokens_used: number;
  retrieved_memories: MemoryItem[];
}

// Upload Types
export interface UploadProgress {
  artifact_id: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  error?: string;
}

export interface UploadResponse {
  artifact_id: string;
  upload_url: string;
  fields: Record<string, string>;
}

// Job Types
export interface Job {
  id: string;
  user_id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  result?: JobResult;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface JobResult {
  type: string;
  data: Record<string, unknown>;
}

export type JobType = 
  | 'transcription'
  | 'embedding'
  | 'voice_clone'
  | 'avatar_generate'
  | 'persona_build'
  | 'memory_process';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Voice Types
export interface VoiceProfile {
  id: string;
  persona_id: string;
  name: string;
  provider: VoiceProvider;
  voice_id: string;
  sample_url?: string;
  settings: VoiceSettings;
  created_at: string;
}

export type VoiceProvider = 'elevenlabs' | 'coqui' | 'openai';

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

// Avatar Types
export interface AvatarConfig {
  id: string;
  persona_id: string;
  image_url: string;
  provider: AvatarProvider;
  settings: AvatarSettings;
  created_at: string;
}

export type AvatarProvider = 'd-id' | 'synthesia' | 'custom';

export interface AvatarSettings {
  style: 'photorealistic' | 'stylized' | '3d';
  expressions: string[];
  lip_sync: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  has_more?: boolean;
}

// Form Types
export interface CreatePersonaForm {
  title: string;
  description?: string;
  relation: string;
  purpose: 'memorial' | 'therapeutic' | 'educational' | 'entertainment';
}

export interface ConsentForm {
  consent_given: boolean;
  data_retention_days: number;
  allow_analytics: boolean;
  email_updates: boolean;
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'job_update' | 'chat_message' | 'upload_progress' | 'error';
  payload: unknown;
}

// Filter & Sort Types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
}
