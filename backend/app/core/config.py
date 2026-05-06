"""
Configuration settings for Afterlife AI
"""

import os
from functools import lru_cache
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "Afterlife AI"
    DEBUG: bool = Field(default=False)
    LOG_LEVEL: str = Field(default="INFO")
    API_V1_PREFIX: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = Field(default="your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # Database (Neon PostgreSQL)
    DATABASE_URL: str = "postgresql://raghav:xxx@ep-cool-moon-12345.us-east-1.aws.neon.tech/beyond_life_ai?sslmode=require"
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_URL: str = "redis://localhost:6379/1"
    
    # JWT
    JWT_SECRET_KEY: str = Field(default="your-jwt-secret-key")
    JWT_REFRESH_SECRET_KEY: str = Field(default="your-refresh-secret-key")
    
    # OpenAI
    OPENAI_API_KEY: str = Field(default="")
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_MAX_TOKENS: int = 4000
    OPENAI_TEMPERATURE: float = 0.7
    
    # Pinecone
    PINECONE_API_KEY: str = Field(default="")
    PINECONE_ENVIRONMENT: str = "us-east-1-aws"
    PINECONE_INDEX_NAME: str = "beyond-life-personas"
    
    # ElevenLabs
    ELEVENLABS_API_KEY: str = Field(default="")
    ELEVENLABS_VOICE_ID: str = Field(default="")
    ELEVENLABS_MODEL: str = "eleven_monolingual_v1"
    
    # D-ID
    DID_API_KEY: str = Field(default="")
    DID_API_URL: str = "https://api.d-id.com"
    
    # Synthesia
    SYNTHESIA_API_KEY: str = Field(default="")
    
    # AWS S3
    AWS_ACCESS_KEY_ID: str = Field(default="")
    AWS_SECRET_ACCESS_KEY: str = Field(default="")
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET: str = "beyond-life-artifacts"
    
    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "phi3:latest"
    OLLAMA_TEMPERATURE: float = 0.7
    OLLAMA_MAX_TOKENS: int = 4096
    OLLAMA_ENABLED: bool = False  # Set to True to use Ollama instead of OpenAI
    
    # Whisper
    WHISPER_MODEL: str = "whisper-1"
    
    # Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 500 * 1024 * 1024  # 500MB
    ALLOWED_FILE_TYPES: List[str] = [
        "txt", "pdf", "docx", "json",
        "mp3", "wav", "m4a", "mp4",
        "jpg", "png", "webp",
    ]
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
    ]
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Rate Limiting
    RATE_LIMIT_MAX: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds
    
    # Encryption
    ENCRYPTION_KEY: str = Field(default="your-32-character-encryption-key")
    
    # Feature Flags
    ENABLE_VOICE: bool = True
    ENABLE_AVATAR: bool = True
    ENABLE_ANALYTICS: bool = False
    
    # Legal
    PRIVACY_POLICY_URL: str = "https://afterlife.ai/privacy"
    TERMS_OF_SERVICE_URL: str = "https://afterlife.ai/terms"
    CONSENT_REQUIRED: bool = True
    DATA_RETENTION_DAYS: int = 365
    
    # Monitoring
    SENTRY_DSN: Optional[str] = None
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
    
    @field_validator("ALLOWED_HOSTS", mode="before")
    @classmethod
    def parse_allowed_hosts(cls, v: List[str] | str) -> List[str]:
        if isinstance(v, str):
            return [host.strip() for host in v.split(",")]
        return v


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings"""
    return Settings()


settings = get_settings()
