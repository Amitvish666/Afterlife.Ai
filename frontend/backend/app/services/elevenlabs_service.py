"""
ElevenLabs TTS and voice cloning service
"""

import logging
from typing import Optional, List, Dict
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class ElevenLabsService:
    """Service for ElevenLabs voice synthesis and voice cloning"""
    
    BASE_URL = "https://api.elevenlabs.io/v1"
    
    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.default_voice_id = settings.ELEVENLABS_VOICE_ID
        self.headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
        }
    
    async def text_to_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
        model_id: str = "eleven_monolingual_v1",
        stability: float = 0.5,
        similarity_boost: float = 0.75,
        style: float = 0.0,
        use_speaker_boost: bool = True,
    ) -> Optional[str]:
        """Convert text to speech"""
        try:
            voice_id = voice_id or self.default_voice_id
            
            payload = {
                "text": text,
                "model_id": model_id,
                "voice_settings": {
                    "stability": stability,
                    "similarity_boost": similarity_boost,
                    "style": style,
                    "use_speaker_boost": use_speaker_boost,
                },
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/text-to-speech/{voice_id}",
                    json=payload,
                    headers=self.headers,
                )
                
                if response.status_code == 200:
                    import base64
                    audio_base64 = base64.b64encode(response.content).decode()
                    return f"data:audio/mp3;base64,{audio_base64}"
                else:
                    logger.error(f"ElevenLabs API error: {response.status_code}")
                    return None
                    
        except Exception as e:
            logger.exception(f"ElevenLabs TTS error: {e}")
            return None
    
    async def get_voices(self) -> list:
        """Get available voices"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/voices",
                    headers=self.headers,
                )
                
                if response.status_code == 200:
                    return response.json().get("voices", [])
                return []
                    
        except Exception as e:
            logger.exception(f"Error getting voices: {e}")
            return []
    
    async def create_voice_clone(
        self,
        name: str,
        files: List[bytes],
        description: str = "",
    ) -> Optional[str]:
        """
        Create a cloned voice from audio samples.
        
        Args:
            name: Name for the new voice
            files: List of audio file bytes (wav or mp3)
            description: Optional description of the voice
            
        Returns:
            Voice ID if successful, None otherwise
        """
        try:
            # Upload audio samples
            sample_ids = []
            
            for i, file_content in enumerate(files):
                # Determine file type from content
                import struct
                
                # Check file signature
                if file_content[:4] == b'RIFF':
                    file_type = "audio/wav"
                elif file_content[:3] == b'ID3' or file_content[:2] == b'\xff\xfb':
                    file_type = "audio/mp3"
                else:
                    file_type = "audio/wav"  # Default
                
                # Create multipart form data
                import io
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.BASE_URL}/voices/{self.default_voice_id}/samples/add",
                        files={"sample": (f"sample_{i}.wav", file_content, file_type)},
                        headers={"xi-api-key": self.api_key},
                    )
                    
                    if response.status_code == 200:
                        sample_data = response.json()
                        sample_ids.append(sample_data.get("sample_id"))
            
            if not sample_ids:
                logger.error("No samples were successfully uploaded")
                return None
            
            # Create voice with samples
            payload = {
                "name": name,
                "samples": [{"id": sid} for sid in sample_ids],
                "description": description,
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/voices",
                    json=payload,
                    headers=self.headers,
                )
                
                if response.status_code == 200:
                    voice_data = response.json()
                    voice_id = voice_data.get("voice_id")
                    logger.info(f"Created voice clone: {voice_id}")
                    return voice_id
            
            return None
            
        except Exception as e:
            logger.exception(f"Voice cloning error: {e}")
            return None
    
    async def create_voice_clone_from_url(
        self,
        name: str,
        audio_urls: List[str],
        description: str = "",
    ) -> Optional[str]:
        """
        Create a cloned voice from audio URLs (for existing S3 files).
        
        Args:
            name: Name for the new voice
            audio_urls: List of audio file URLs
            description: Optional description of the voice
            
        Returns:
            Voice ID if successful, None otherwise
        """
        try:
            # Download audio files first
            import httpx
            
            files = []
            for url in audio_urls:
                async with httpx.AsyncClient() as client:
                    response = await client.get(url)
                    if response.status_code == 200:
                        files.append(response.content)
            
            return await self.create_voice_clone(name, files, description)
            
        except Exception as e:
            logger.exception(f"Voice cloning from URLs error: {e}")
            return None
    
    async def get_voice_settings(self, voice_id: str) -> dict:
        """Get settings for a specific voice"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/voices/{voice_id}/settings",
                    headers=self.headers,
                )
                
                if response.status_code == 200:
                    return response.json()
                return {}
                    
        except Exception as e:
            logger.exception(f"Error getting voice settings: {e}")
            return {}
    
    async def update_voice_settings(
        self,
        voice_id: str,
        stability: float = 0.5,
        similarity_boost: float = 0.75,
    ) -> bool:
        """Update settings for a specific voice"""
        try:
            payload = {
                "stability": stability,
                "similarity_boost": similarity_boost,
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/voices/{voice_id}/settings",
                    json=payload,
                    headers=self.headers,
                )
                
                return response.status_code == 200
                
        except Exception as e:
            logger.exception(f"Error updating voice settings: {e}")
            return False
    
    async def delete_voice(self, voice_id: str) -> bool:
        """Delete a custom voice"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.BASE_URL}/voices/{voice_id}",
                    headers=self.headers,
                )
                
                return response.status_code == 200
                
        except Exception as e:
            logger.exception(f"Error deleting voice: {e}")
            return False
    
    async def get_default_voices(self) -> List[Dict]:
        """Get list of recommended default voices"""
        return [
            {
                "voice_id": "21m00Tcm4TlvDq8ikWAM",
                "name": "Rachel",
                "labels": {"accent": "american", "gender": "female", "age": "young", "use_case": "general"},
            },
            {
                "voice_id": "AZnzlk1XvdvUeBnXmlld",
                "name": "Domi",
                "labels": {"accent": "american", "gender": "female", "age": "young", "use_case": "general"},
            },
            {
                "voice_id": "EXAVITQu4vr4xnSDxMaL",
                "name": "Bella",
                "labels": {"accent": "american", "gender": "female", "age": "young", "use_case": "general"},
            },
            {
                "voice_id": "ErXwobaYiN019PkySvjV",
                "name": "Antoni",
                "labels": {"accent": "american", "gender": "male", "age": "middle_aged", "use_case": "general"},
            },
            {
                "voice_id": "MF3mGyEYi5IxKVg6KSZA",
                "name": "Josh",
                "labels": {"accent": "american", "gender": "male", "age": "middle_aged", "use_case": "general"},
            },
            {
                "voice_id": "nPczCjz82KWdKScP46A1",
                "name": "Arnold",
                "labels": {"accent": "american", "gender": "male", "age": "older", "use_case": "general"},
            },
        ]
