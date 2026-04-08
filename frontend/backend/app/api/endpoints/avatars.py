"""
Avatar generation API endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class AvatarGenerateRequest(BaseModel):
    image_url: str
    text: str
    language: str = "en"


class AvatarGenerateResponse(BaseModel):
    video_url: Optional[str] = None
    status: str


@router.post("/generate", response_model=AvatarGenerateResponse)
async def generate_talking_avatar(request: AvatarGenerateRequest):
    """
    Generate a D-ID talking avatar with lip-sync
    """
    try:
        from app.services.did_service import DIDService
        from app.services.elevenlabs_service import ElevenLabsService
        
        did_service = DIDService()
        
        # Generate audio from text using ElevenLabs
        elevenlabs = ElevenLabsService()
        voice_id = "21m00Tcm4TlvDq8ikWAM"  # Default Rachel voice
        
        audio_url = await elevenlabs.text_to_speech(request.text, voice_id)
        
        if not audio_url:
            raise HTTPException(status_code=500, detail="Failed to generate audio")
        
        # Generate talking avatar with D-ID
        video_url = await did_service.generate_talking_avatar(
            image_url=request.image_url,
            audio_url=audio_url
        )
        
        if video_url:
            return AvatarGenerateResponse(video_url=video_url, status="success")
        else:
            return AvatarGenerateResponse(status="failed", video_url=None)
            
    except Exception as e:
        print(f"Error generating avatar: {e}")
        raise HTTPException(status_code=500, detail=str(e))
