"""
Voice/TTS API endpoints
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.elevenlabs_service import ElevenLabsService

logger = logging.getLogger(__name__)
router = APIRouter()
elevenlabs = ElevenLabsService()


class TTSRequest(BaseModel):
    text: str
    voice_id: str = None
    stability: float = 0.5
    similarity_boost: float = 0.75


@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech using ElevenLabs"""
    try:
        audio_base64 = await elevenlabs.text_to_speech(
            text=request.text,
            voice_id=request.voice_id,
            stability=request.stability,
            similarity_boost=request.similarity_boost,
        )
        
        if audio_base64:
            return {"audio": audio_base64}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate speech")
            
    except Exception as e:
        logger.exception(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/voices")
async def get_available_voices():
    """Get available ElevenLabs voices"""
    try:
        voices = await elevenlabs.get_voices()
        return {"voices": voices}
    except Exception as e:
        logger.exception(f"Get voices error: {e}")
        return {"voices": []}
