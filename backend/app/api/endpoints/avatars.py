"""
Avatar generation API endpoints (Demo Mode)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class AvatarGenerateRequest(BaseModel):
    image_url: str
    text: str
    language: str = "en"
    avatar_id: Optional[str] = "anna_costume1"


class AvatarGenerateResponse(BaseModel):
    video_url: Optional[str] = None
    status: str
    message: Optional[str] = None


@router.post("/generate", response_model=AvatarGenerateResponse)
async def generate_talking_avatar(request: AvatarGenerateRequest):
    """
    Generate an AI avatar video with lip-sync (Demo Mode)
    Note: For production, configure D-ID and ElevenLabs API keys
    """
    try:
        # Use a default avatar image if not provided
        avatar_image = request.image_url or "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg"
        
        # Return demo response with the avatar image
        # In production, this would call D-ID and ElevenLabs APIs
        return AvatarGenerateResponse(
            video_url=avatar_image,
            status="demo",
            message=f"Avatar speaking: '{request.text[:100]}...'"
        )
            
    except Exception as e:
        logger.error(f"Error generating avatar: {e}")
        return AvatarGenerateResponse(
            status="error",
            message=str(e)
        )


@router.get("/avatars")
async def list_avatars():
    """List available avatars"""
    return {
        "avatars": [
            {"id": "avatar1", "name": "Business Woman", "image_url": "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg"},
            {"id": "avatar2", "name": "Professional Man", "image_url": "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg"},
            {"id": "avatar3", "name": "Casual Woman", "image_url": "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg"},
        ]
    }


@router.get("/voices")
async def list_voices():
    """List available voices"""
    return {
        "voices": [
            {"id": "voice1", "name": "Rachel", "language": "en"},
            {"id": "voice2", "name": "Adam", "language": "en"},
            {"id": "voice3", "name": "Sam", "language": "en"},
        ]
    }
