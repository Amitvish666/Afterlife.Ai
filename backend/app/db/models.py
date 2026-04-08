"""
SQLAlchemy database models for Beyond Life AI
"""

from datetime import datetime
from typing import Optional, Type, TypeVar
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, JSON, ForeignKey, Float, LargeBinary, select
from sqlalchemy.orm import relationship, declared_attr, declarative_mixin
from sqlalchemy.sql import func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import Base

T = TypeVar('T', bound=Base)


@declarative_mixin
class ModelMixin:
    """Base mixin with common database operations"""
    
    @declared_attr
    def id(cls):
        return Column(String(36), primary_key=True, default=lambda: str(datetime.utcnow().timestamp()))
    
    @declared_attr
    def created_at(cls):
        return Column(DateTime(timezone=True), server_default=func.now())
    
    @declared_attr
    def updated_at(cls):
        return Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    @classmethod
    async def get(cls: Type[T], db: AsyncSession, id: str) -> Optional[T]:
        """Get a record by ID"""
        result = await db.execute(select(cls).where(cls.id == id))
        return result.scalar_one_or_none()
    
    @classmethod
    async def get_by_email(cls: Type[T], db: AsyncSession, email: str) -> Optional[T]:
        """Get a record by email (for User model)"""
        if not hasattr(cls, 'email'):
            return None
        result = await db.execute(select(cls).where(cls.email == email))
        return result.scalar_one_or_none()
    
    @classmethod
    async def get_by_persona(cls: Type[T], db: AsyncSession, persona_id: str) -> list[T]:
        """Get records by persona_id (for VoiceProfile, AvatarConfig)"""
        if not hasattr(cls, 'persona_id'):
            return []
        result = await db.execute(select(cls).where(cls.persona_id == persona_id))
        return list(result.scalars().all())


class User(Base):
    """User model for authentication and ownership"""
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(datetime.utcnow().timestamp()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    consent_given = Column(Boolean, default=False)
    consent_timestamp = Column(DateTime, nullable=True)
    data_retention_days = Column(Integer, default=365)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    personas = relationship("Persona", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, name={self.name})>"


class Persona(Base):
    """Persona model representing a digital persona"""
    __tablename__ = "personas"
    
    id = Column(String(36), primary_key=True, default=lambda: str(datetime.utcnow().timestamp()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    relation = Column(String(100), nullable=True)  # e.g., "grandmother", "father", "friend"
    purpose = Column(String(50), default="memorial")  # memorial, therapeutic, educational, entertainment
    status = Column(String(20), default="processing")  # processing, ready, error, deleted
    avatar_url = Column(String(500), nullable=True)
    voice_id = Column(String(100), nullable=True)
    summary = Column(JSON, nullable=True)  # Persona summary data
    settings = Column(JSON, nullable=True)  # Persona-specific settings
    memory_count = Column(Integer, default=0)
    last_interaction = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="personas")
    artifacts = relationship("Artifact", back_populates="persona", cascade="all, delete-orphan")
    memories = relationship("MemoryItem", back_populates="persona", cascade="all, delete-orphan")
    sessions = relationship("ChatSession", back_populates="persona", cascade="all, delete-orphan")
    voices = relationship("VoiceProfile", back_populates="persona", cascade="all, delete-orphan")
    avatars = relationship("AvatarConfig", back_populates="persona", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="persona", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Persona(id={self.id}, title={self.title}, status={self.status})>"


class Artifact(Base):
    """Artifact model for uploaded files"""
    __tablename__ = "artifacts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(datetime.utcnow().timestamp()))
    persona_id = Column(String(36), ForeignKey("personas.id"), nullable=False, index=True)
    file_type = Column(String(20), nullable=False)  # text, audio, video, image
    original_filename = Column(String(255), nullable=False)
    s3_key = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    status = Column(String(20), default="pending")  # pending, processing, ready, error
    file_metadata = Column(JSON, nullable=True)  # renamed from metadata to avoid conflict
    processed_text_id = Column(String(36), nullable=True)
    virus_scan_passed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    persona = relationship("Persona", back_populates="artifacts")
    processed_text = relationship("ProcessedText", back_populates="artifact", uselist=False)
    
    def __repr__(self):
        return f"<Artifact(id={self.id}, file_type={self.file_type}, original_filename={self.original_filename})>"


class ProcessedText(Base):
    """Processed text from artifacts"""
    __tablename__ = "processed_texts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(datetime.utcnow().timestamp()))
    artifact_id = Column(String(36), ForeignKey("artifacts.id"), nullable=False, index=True)
    text_content = Column(Text, nullable=False)
    language = Column(String(10), default="en")
    chunks = Column(JSON, nullable=True)  # Text chunks for embedding
    word_count = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    artifact = relationship("Artifact", back_populates="processed_text")
    
    def __repr__(self):
        return f"<ProcessedText(id={self.id}, word_count={self.word_count})>"


class MemoryItem(Base):
    """Memory item extracted from artifacts"""
    __tablename__ = "memory_items"
    
    id = Column(String(36), primary_key=True, default=lambda: str(datetime.utcnow().timestamp()))
    persona_id = Column(String(36), ForeignKey("personas.id"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    embedding = Column(LargeBinary, nullable=True)  # Vector embedding
    source = Column(String(255), nullable=True)
    source_type = Column(String(50), nullable=True)  # chat, email, post, transcript, etc.
    timestamp = Column(DateTime, nullable=True)
    importance = Column(Float, default=0.5)
    category = Column(String(50), default="personal_fact")  # personal_fact, relationship, preference, memory, etc.
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    persona = relationship("Persona", back_populates="memories")
    
    def __repr__(self):
        return f"<MemoryItem(id={self.id}, category={self.category}, importance={self.importance})>"


class ChatSession(Base):
    """Chat session for conversations with persona"""
    __tablename__ = "chat_sessions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(datetime.utcnow().timestamp()))
    persona_id = Column(String(36), ForeignKey("personas.id"), nullable=False, index=True)
    title = Column(String(255), default="New Conversation")
    message_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    persona = relationship("Persona", back_populates="sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ChatSession(id={self.id}, title={self.title})>"


class ChatMessage(Base):
    """Individual chat message"""
    __tablename__ = "chat_messages"
    
    id = Column(String(36), primary_key=True, default=lambda: str(datetime.utcnow().timestamp()))
    session_id = Column(String(36), ForeignKey("chat_sessions.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    audio_url = Column(String(500), nullable=True)
    avatar_video_url = Column(String(500), nullable=True)
    tokens_used = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    
    def __repr__(self):
        return f"<ChatMessage(id={self.id}, role={self.role}, created_at={self.created_at})>"


class VoiceProfile(Base):
    """Voice profile for TTS"""
    __tablename__ = "voice_profiles"
    
    id = Column(String(36), primary_key=True, default=lambda: str(datetime.utcnow().timestamp()))
    persona_id = Column(String(36), ForeignKey("personas.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    provider = Column(String(50), nullable=False)  # elevenlabs, coqui, openai
    voice_id = Column(String(100), nullable=False)
    sample_url = Column(String(500), nullable=True)
    settings = Column(JSON, nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    persona = relationship("Persona", back_populates="voices")
    
    def __repr__(self):
        return f"<VoiceProfile(id={self.id}, name={self.name}, provider={self.provider})>"


class AvatarConfig(Base):
    """Avatar configuration"""
    __tablename__ = "avatar_configs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(datetime.utcnow().timestamp()))
    persona_id = Column(String(36), ForeignKey("personas.id"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    provider = Column(String(50), nullable=False)  # d-id, synthesia, custom
    style = Column(String(50), default="photorealistic")  # photorealistic, stylized, 3d
    settings = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    persona = relationship("Persona", back_populates="avatars")
    
    def __repr__(self):
        return f"<AvatarConfig(id={self.id}, provider={self.provider}, style={self.style})>"


class Job(Base):
    """Background job for long-running tasks"""
    __tablename__ = "jobs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(datetime.utcnow().timestamp()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    persona_id = Column(String(36), ForeignKey("personas.id"), nullable=True, index=True)
    type = Column(String(50), nullable=False)  # transcription, embedding, voice_clone, avatar_generate, etc.
    status = Column(String(20), default="pending")  # pending, processing, completed, failed
    progress = Column(Float, default=0.0)
    result = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    persona = relationship("Persona", back_populates="jobs")
    
    def __repr__(self):
        return f"<Job(id={self.id}, type={self.type}, status={self.status})>"


class Task(Base):
    """Task model for persona-related tasks"""
    __tablename__ = "tasks"
    
    id = Column(String(36), primary_key=True, default=lambda: str(datetime.utcnow().timestamp()))
    persona_id = Column(String(36), ForeignKey("personas.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # upload_memories, voice_recording, avatar_generation, etc.
    status = Column(String(20), default="pending")  # pending, processing, completed, failed
    progress = Column(Float, default=0.0)
    result = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    persona = relationship("Persona")
    
    def __repr__(self):
        return f"<Task(id={self.id}, type={self.type}, status={self.status})>"


class AuditLog(Base):
    """Audit log for user actions"""
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(datetime.utcnow().timestamp()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(36), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action}, resource_type={self.resource_type})>"
