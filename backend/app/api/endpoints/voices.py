"""
Voice/TTS API endpoints
"""

import logging
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import User, Persona, VoiceProfile
from app.core.security import get_current_user
from app.services.elevenlabs_service import ElevenLabsService

logger = logging.getLogger(__name__)
router = APIRouter()
elevenlabs = ElevenLabsService()


class TTSRequest(BaseModel):
    text: str
    voice_id: str = None
    stability: float = 0.5
    similarity_boost: float = 0.75


class VoiceProfileCreate(BaseModel):
    name: str
    voice_id: str
    provider: str = "elevenlabs"
    is_default: bool = False


class VoiceProfileResponse(BaseModel):
    id: str
    persona_id: str
    name: str
    provider: str
    voice_id: str
    is_default: bool
    created_at: str
    
    class Config:
        from_attributes = True


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


# Voice Profile Management Endpoints

@router.get("/personas/{persona_id}/voices", response_model=List[VoiceProfileResponse])
async def list_voice_profiles(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List voice profiles for a persona"""
    persona = await Persona.get(db, persona_id)
    if not persona or persona.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    voices = await VoiceProfile.get_by_persona(db, persona_id)
    return [
        VoiceProfileResponse(
            id=v.id,
            persona_id=v.persona_id,
            name=v.name,
            provider=v.provider,
            voice_id=v.voice_id,
            is_default=v.is_default,
            created_at=v.created_at.isoformat() if v.created_at else ""
        )
        for v in voices
    ]


@router.post("/personas/{persona_id}/voices", response_model=VoiceProfileResponse)
async def create_voice_profile(
    persona_id: str,
    data: VoiceProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a voice profile for a persona"""
    persona = await Persona.get(db, persona_id)
    if not persona or persona.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # Check if this should be the default voice
    if data.is_default:
        # Remove default from other voices
        existing = await VoiceProfile.get_by_persona(db, persona_id)
        for voice in existing:
            if voice.is_default:
                voice.is_default = False
                await db.commit()
    
    # Create new voice profile
    voice = VoiceProfile(
        id=str(uuid.uuid4()),
        persona_id=persona_id,
        name=data.name,
        provider=data.provider,
        voice_id=data.voice_id,
        is_default=data.is_default,
    )
    
    db.add(voice)
    await db.commit()
    await db.refresh(voice)
    
    # Update persona's default voice_id
    if data.is_default:
        persona.voice_id = data.voice_id
        await db.commit()
    
    return VoiceProfileResponse(
        id=voice.id,
        persona_id=voice.persona_id,
        name=voice.name,
        provider=voice.provider,
        voice_id=voice.voice_id,
        is_default=voice.is_default,
        created_at=voice.created_at.isoformat() if voice.created_at else ""
    )


@router.delete("/personas/{persona_id}/voices/{voice_id}", status_code=204)
async def delete_voice_profile(
    persona_id: str,
    voice_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a voice profile"""
    persona = await Persona.get(db, persona_id)
    if not persona or persona.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    voice = await VoiceProfile.get(db, voice_id)
    if not voice or voice.persona_id != persona_id:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    
    await db.delete(voice)
    await db.commit()
    
    return None


@router.put("/personas/{persona_id}/voices/{voice_id}/default", response_model=VoiceProfileResponse)
async def set_default_voice(
    persona_id: str,
    voice_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set a voice profile as default"""
    persona = await Persona.get(db, persona_id)
    if not persona or persona.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # Remove default from all other voices
    existing = await VoiceProfile.get_by_persona(db, persona_id)
    for voice in existing:
        if voice.is_default:
            voice.is_default = False
    
    # Set new default
    voice = await VoiceProfile.get(db, voice_id)
    if not voice or voice.persona_id != persona_id:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    
    voice.is_default = True
    persona.voice_id = voice.voice_id
    
    await db.commit()
    await db.refresh(voice)
    
    return VoiceProfileResponse(
        id=voice.id,
        persona_id=voice.persona_id,
        name=voice.name,
        provider=voice.provider,
        voice_id=voice.voice_id,
        is_default=voice.is_default,
        created_at=voice.created_at.isoformat() if voice.created_at else ""
    )


@router.post("/voice/clone")
async def clone_voice(
    name: str = Form(...),
    description: str = Form(""),
    audio_files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
):
    """Clone a voice from audio samples"""
    try:
        # Read audio files
        files = []
        for audio_file in audio_files:
            content = await audio_file.read()
            files.append(content)
        
        # Create voice clone
        voice_id = await elevenlabs.create_voice_clone(
            name=name,
            files=files,
            description=description
        )
        
        if voice_id:
            return {"voice_id": voice_id, "name": name}
        else:
            raise HTTPException(status_code=500, detail="Failed to clone voice")
            
    except Exception as e:
        logger.exception(f"Voice cloning error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
