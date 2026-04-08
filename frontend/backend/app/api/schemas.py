"""
Pydantic schemas for API requests and responses
"""

from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, Field, field_validator


# ============== Common Schemas ==============

class Message(BaseModel):
    """Simple message response"""
    message: str


class ErrorDetail(BaseModel):
    """Error details"""
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ApiResponse(BaseModel):
    """Standard API response"""
    success: bool
    data: Optional[Any] = None
    error: Optional[ErrorDetail] = None
    meta: Optional[Dict[str, Any]] = None


class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)


class PaginatedResponse(BaseModel):
    """Paginated response wrapper"""
    items: List[Any]
    total: int
    page: int
    limit: int
    has_more: bool


# ============== Auth Schemas ==============

class LoginRequest(BaseModel):
    """Login request"""
    email: EmailStr
    password: str = Field(min_length=8)


class RegisterRequest(BaseModel):
    """Registration request"""
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=2, max_length=100)


class TokenResponse(BaseModel):
    """Token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    """User response"""
    id: str
    email: str
    name: str
    avatar_url: Optional[str] = None
    consent_given: bool
    data_retention_days: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """User update request"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    avatar_url: Optional[str] = None


# ============== Persona Schemas ==============

class PersonaCreate(BaseModel):
    """Create persona request"""
    title: str = Field(min_length=2, max_length=255)
    description: Optional[str] = None
    relation: Optional[str] = Field(None, max_length=100)
    purpose: str = Field(default="memorial", max_length=50)


class PersonaUpdate(BaseModel):
    """Update persona request"""
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None


class PersonaResponse(BaseModel):
    """Persona response"""
    id: str
    user_id: str
    title: str
    description: Optional[str]
    relation: Optional[str]
    purpose: str
    status: str
    avatar_url: Optional[str]
    voice_id: Optional[str]
    memory_count: int
    last_interaction: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PersonaSummary(BaseModel):
    """Persona summary"""
    name: str
    date_of_birth: Optional[str] = None
    relationships: List[str] = []
    key_facts: List[str] = []
    personality_traits: List[str] = []
    speech_patterns: List[str] = []
    interests: List[str] = []
    sample_responses: List[str] = []


# ============== Artifact Schemas ==============

class ArtifactCreate(BaseModel):
    """Create artifact request"""
    file_type: str
    original_filename: str
    metadata: Optional[Dict[str, Any]] = None


class ArtifactResponse(BaseModel):
    """Artifact response"""
    id: str
    persona_id: str
    file_type: str
    original_filename: str
    file_size: int
    mime_type: str
    status: str
    metadata: Optional[Dict[str, Any]]
    created_at: datetime
    
    class Config:
        from_attributes = True


class UploadUrlResponse(BaseModel):
    """Presigned upload URL response"""
    upload_url: str
    fields: Dict[str, str]
    artifact_id: str


# ============== Memory Schemas ==============

class MemoryItemResponse(BaseModel):
    """Memory item response"""
    id: str
    persona_id: str
    text: str
    source: Optional[str]
    source_type: Optional[str]
    timestamp: Optional[datetime]
    importance: float
    category: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class MemoryItemUpdate(BaseModel):
    """Update memory item"""
    text: Optional[str] = None
    category: Optional[str] = None
    importance: Optional[float] = Field(None, ge=0, le=1)


# ============== Chat Schemas ==============

class ChatSessionCreate(BaseModel):
    """Create chat session"""
    title: Optional[str] = None


class ChatSessionResponse(BaseModel):
    """Chat session response"""
    id: str
    persona_id: str
    title: str
    message_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ChatMessageResponse(BaseModel):
    """Chat message response"""
    id: str
    session_id: str
    role: str
    content: str
    audio_url: Optional[str]
    avatar_video_url: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    """Send chat message request"""
    session_id: Optional[str] = None
    message: str = Field(min_length=1, max_length=10000)
    enable_voice: bool = True
    enable_avatar: bool = True
    temperature: Optional[float] = Field(None, ge=0, le=2)
    language: str = 'en'  # 'en' for English, 'hi' for Hindi, 'mr' for Marathi


class ChatResponse(BaseModel):
    """Chat response"""
    message_id: str
    session_id: str
    content: str
    audio_url: Optional[str]
    avatar_video_url: Optional[str]
    tokens_used: int
    retrieved_memories: List[MemoryItemResponse]


# ============== Voice Schemas ==============

class VoiceProfileCreate(BaseModel):
    """Create voice profile"""
    name: str = Field(min_length=2, max_length=100)
    sample_urls: List[str] = Field(min_length=1, max_length=10)


class VoiceProfileResponse(BaseModel):
    """Voice profile response"""
    id: str
    persona_id: str
    name: str
    provider: str
    voice_id: str
    sample_url: Optional[str]
    is_default: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============== Avatar Schemas ==============

class AvatarCreate(BaseModel):
    """Create avatar request"""
    image_url: str
    style: str = Field(default="photorealistic", max_length=50)


class AvatarResponse(BaseModel):
    """Avatar response"""
    id: str
    persona_id: str
    image_url: str
    provider: str
    style: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============== Job Schemas ==============

class JobResponse(BaseModel):
    """Job response"""
    id: str
    user_id: str
    persona_id: Optional[str]
    type: str
    status: str
    progress: float
    error: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============== Task Schemas ==============

class TaskCreate(BaseModel):
    """Create task request"""
    persona_id: str
    type: str = Field(..., max_length=50)


class TaskResponse(BaseModel):
    """Task response"""
    id: str
    persona_id: str
    user_id: str
    type: str
    status: str
    progress: float
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TaskUpdate(BaseModel):
    """Update task request"""
    status: Optional[str] = None
    progress: Optional[float] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============== Consent Schemas ==============

class ConsentRequest(BaseModel):
    """Consent request"""
    consent_given: bool
    data_retention_days: int = Field(default=365, ge=1, le=3650)
    allow_analytics: bool = False
    email_updates: bool = False


# ============== File Upload Schemas ==============

class FileUploadRequest(BaseModel):
    """File upload request"""
    filename: str
    content_type: str
    file_size: int
    
    @field_validator("content_type")
    @classmethod
    def validate_content_type(cls, v: str) -> str:
        allowed_types = [
            "text/plain",
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/json",
            "audio/mpeg",
            "audio/wav",
            "audio/mp4",
            "video/mp4",
            "image/jpeg",
            "image/png",
            "image/webp",
        ]
        if v not in allowed_types:
            raise ValueError(f"Invalid content type. Allowed: {allowed_types}")
        return v
