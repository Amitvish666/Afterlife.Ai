"""
API router - combines all route modules
"""

from fastapi import APIRouter

# Import all endpoint routers
from app.api.endpoints import (
    auth, users, personas, voices, avatars,
    chat, memories, artifacts, jobs
)

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(personas.router, prefix="/personas", tags=["Personas"])
api_router.include_router(voices.router, prefix="/voices", tags=["Voices"])
api_router.include_router(avatars.router, prefix="/avatars", tags=["Avatars"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_router.include_router(memories.router, prefix="/memories", tags=["Memories"])
api_router.include_router(artifacts.router, prefix="/artifacts", tags=["Artifacts"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
