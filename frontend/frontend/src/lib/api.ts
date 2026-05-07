import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse, ApiError } from '@/types';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 60000, // 60 seconds for long-running operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Get token from storage (check both localStorage and sessionStorage)
    if (typeof window !== 'undefined') {
      let token = localStorage.getItem('access_token');
      if (!token) {
        token = sessionStorage.getItem('access_token');
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        let refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          refreshToken = sessionStorage.getItem('refresh_token');
        }
        if (refreshToken) {
          const response = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refresh_token: refreshToken }
          );

          const { access_token, refresh_token } = response.data.data;
          
          // Store tokens back to the same storage they came from
          if (localStorage.getItem('access_token')) {
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('refresh_token', refresh_token);
          } else {
            sessionStorage.setItem('access_token', access_token);
            sessionStorage.setItem('refresh_token', refresh_token);
          }

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login and clear all storage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// API methods
export const apiClient = {
  // Auth
  login: (email: string, password: string) =>
    api.post<ApiResponse<{ user: unknown; tokens: unknown }>>('/auth/login', { email, password }),
  
  register: (data: { email: string; password: string; name: string }) =>
    api.post<ApiResponse<{ user: unknown; tokens: unknown }>>('/auth/register', data),
  
  refresh: (refresh_token: string) =>
    api.post<ApiResponse<{ access_token: string; refresh_token: string }>>('/auth/refresh', { refresh_token }),
  
  logout: () => api.post('/auth/logout'),
  
  // Users
  getProfile: () => api.get<ApiResponse<unknown>>('/auth/me'),
  
  updateProfile: (data: Partial<{ name: string; avatar: string }>) =>
    api.put<ApiResponse<unknown>>('/users/me', data),
  
  deleteAccount: () => api.delete<ApiResponse<unknown>>('/users/me'),
  
  // Personas
  listPersonas: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<ApiResponse<unknown[]>>('/personas', { params }),
  
  getPersona: (id: string) => api.get<ApiResponse<unknown>>(`/personas/${id}`),
  
  createPersona: (data: { title: string; description?: string; relation: string; purpose: string }) =>
    api.post<ApiResponse<unknown>>('/personas', data),
  
  updatePersona: (id: string, data: Partial<{ title: string; description: string }>) =>
    api.put<ApiResponse<unknown>>(`/personas/${id}`, data),
  
  deletePersona: (id: string) => api.delete<ApiResponse<unknown>>(`/personas/${id}`),

  // Tasks
  listTasks: (personaId?: string) =>
    api.get<ApiResponse<unknown[]>>(`/personas/tasks`, { params: { persona_id: personaId } }),

  createTask: (data: { persona_id: string; type: string }) =>
    api.post<ApiResponse<unknown>>('/personas/tasks', data),

  updateTask: (taskId: string, data: Partial<{ status: string; progress: number; result: any; error: string }>) =>
    api.put<ApiResponse<unknown>>(`/personas/tasks/${taskId}`, data),

  deleteTask: (taskId: string) => api.delete<ApiResponse<unknown>>(`/personas/tasks/${taskId}`),

  getPersonaSummary: (id: string) => api.get<ApiResponse<unknown>>(`/personas/${id}/summary`),
  
  // Artifacts
  listArtifacts: (personaId: string, params?: { page?: number; limit?: number }) =>
    api.get<ApiResponse<unknown[]>>(`/personas/${personaId}/artifacts`, { params }),
  
  uploadArtifact: (personaId: string, file: File, metadata?: Record<string, string>) => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    return api.post<ApiResponse<unknown>>(`/personas/${personaId}/artifacts`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  deleteArtifact: (personaId: string, artifactId: string) =>
    api.delete<ApiResponse<unknown>>(`/personas/${personaId}/artifacts/${artifactId}`),
  
  // Memories
  listMemories: (personaId: string, params?: { page?: number; limit?: number; category?: string }) =>
    api.get<ApiResponse<unknown[]>>(`/personas/${personaId}/memories`, { params }),
  
  getMemory: (personaId: string, memoryId: string) =>
    api.get<ApiResponse<unknown>>(`/personas/${personaId}/memories/${memoryId}`),
  
  updateMemory: (personaId: string, memoryId: string, data: Partial<{ text: string; category: string }>) =>
    api.put<ApiResponse<unknown>>(`/personas/${personaId}/memories/${memoryId}`, data),
  
  deleteMemory: (personaId: string, memoryId: string) =>
    api.delete<ApiResponse<unknown>>(`/personas/${personaId}/memories/${memoryId}`),
  
  // Chat
  listSessions: (personaId: string) =>
    api.get<ApiResponse<unknown[]>>(`/personas/${personaId}/sessions`),
  
  createSession: (personaId: string, data?: { title?: string }) =>
    api.post<ApiResponse<unknown>>(`/personas/${personaId}/sessions`, data),
  
  getSession: (personaId: string, sessionId: string) =>
    api.get<ApiResponse<unknown>>(`/personas/${personaId}/sessions/${sessionId}`),
  
  deleteSession: (personaId: string, sessionId: string) =>
    api.delete<ApiResponse<unknown>>(`/personas/${personaId}/sessions/${sessionId}`),
  
  listMessages: (personaId: string, sessionId: string) =>
    api.get<ApiResponse<unknown[]>>(`/personas/${personaId}/sessions/${sessionId}/messages`),

  sendMessage: (personaId: string, sessionId: string, data: { 
    message: string; 
    conversation_history?: any[];
    language?: string;
    persona?: any;
    memories?: any[];
    enable_voice?: boolean; 
    enable_avatar?: boolean 
  }) =>
    api.post<ApiResponse<unknown>>(`/personas/${personaId}/sessions/${sessionId}/messages`, data),
  
  // Jobs
  listJobs: (params?: { status?: string; type?: string }) =>
    api.get<ApiResponse<unknown[]>>('/jobs', { params }),
  
  getJob: (jobId: string) => api.get<ApiResponse<unknown>>(`/jobs/${jobId}`),
  
  // Voice
  getVoiceProfiles: (personaId: string) =>
    api.get<ApiResponse<unknown[]>>(`/personas/${personaId}/voices`),
  
  createVoiceProfile: (personaId: string, data: { name: string; sample_urls: string[] }) =>
    api.post<ApiResponse<unknown>>(`/personas/${personaId}/voices`, data),
  
  // Avatar
  getAvatarConfig: (personaId: string) =>
    api.get<ApiResponse<unknown>>(`/personas/${personaId}/avatar`),
  
  createAvatar: (personaId: string, data: { image_url: string; style: string }) =>
    api.post<ApiResponse<unknown>>(`/personas/${personaId}/avatar`, data),

  listAvatars: (personaId: string) =>
    api.get<ApiResponse<unknown[]>>(`/personas/${personaId}/avatars`),

  generateAvatar: (personaId: string, data: { style?: string; prompt?: string; size?: string }) =>
    api.post<ApiResponse<unknown>>(`/personas/${personaId}/avatars/generate`, data),

  deleteAvatar: (personaId: string, avatarId: string) =>
    api.delete<ApiResponse<unknown>>(`/personas/${personaId}/avatars/${avatarId}`),
  
  // Presigned URLs
  getUploadUrl: (personaId: string, filename: string, contentType: string) =>
    api.post<ApiResponse<{ upload_url: string; fields: Record<string, string> }>>(
      `/personas/${personaId}/upload-url`,
      { filename, content_type: contentType }
    ),
};

export default api;
