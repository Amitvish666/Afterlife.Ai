"""
D-ID Avatar generation service with enhanced features
"""

import logging
from typing import Optional, List, Dict
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class DIDService:
    """Service for D-ID avatar generation with lip-sync"""
    
    BASE_URL = "https://api.d-id.com"
    
    def __init__(self):
        self.api_key = settings.DID_API_KEY
        self.headers = {
            "Authorization": f"Basic {self.api_key}",
            "Content-Type": "application/json",
        }
    
    async def generate_talking_avatar(
        self,
        image_url: str,
        audio_url: str,
        webhook_url: Optional[str] = None,
        provider: str = "d-id",
    ) -> Optional[str]:
        """Generate a talking avatar video"""
        try:
            payload = {
                "source_url": image_url,
                "audio_url": audio_url,
                "webhook": webhook_url,
            }
            
            async with httpx.AsyncClient(timeout=180) as client:
                response = await client.post(
                    f"{self.BASE_URL}/talks",
                    json=payload,
                    headers=self.headers,
                )
                
                if response.status_code == 201:
                    talk_id = response.json().get("id")
                    # Poll for result (with longer timeout for avatars)
                    video_url = await self._wait_for_talk(
                        talk_id,
                        max_attempts=120,  # Up to 4 minutes
                        delay=2.0,
                    )
                    return video_url
                else:
                    logger.error(f"D-ID API error: {response.status_code}")
                    return None
                    
        except Exception as e:
            logger.exception(f"D-ID avatar generation error: {e}")
            return None
    
    async def generate_talking_avatar_from_text(
        self,
        image_url: str,
        text: str,
        voice_id: str,
        webhook_url: Optional[str] = None,
    ) -> Optional[str]:
        """Generate talking avatar with text-to-speech"""
        try:
            # First generate audio from text using ElevenLabs
            from app.services.elevenlabs_service import ElevenLabsService
            tts = ElevenLabsService()
            audio_url = await tts.text_to_speech(text, voice_id)
            
            if not audio_url:
                logger.error("Failed to generate audio for avatar")
                return None
            
            # Then generate avatar
            return await self.generate_talking_avatar(
                image_url=image_url,
                audio_url=audio_url,
                webhook_url=webhook_url,
            )
            
        except Exception as e:
            logger.exception(f"D-ID avatar generation from text error: {e}")
            return None
    
    async def _wait_for_talk(
        self,
        talk_id: str,
        max_attempts: int = 60,
        delay: float = 2.0,
    ) -> Optional[str]:
        """Wait for avatar generation to complete"""
        try:
            async with httpx.AsyncClient() as client:
                for _ in range(max_attempts):
                    response = await client.get(
                        f"{self.BASE_URL}/talks/{talk_id}",
                        headers=self.headers,
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        status = data.get("status")
                        
                        if status == "done":
                            return data.get("result_url")
                        elif status == "error":
                            error_msg = data.get('error', 'Unknown error')
                            logger.error(f"D-ID talk error: {error_msg}")
                            return None
                    
                    await __import__("asyncio").sleep(delay)
                
                logger.error(f"D-ID talk timed out after {max_attempts} attempts")
                return None
                
        except Exception as e:
            logger.exception(f"Error waiting for talk: {e}")
            return None
    
    async def get_talk_status(self, talk_id: str) -> dict:
        """Get status of a talk generation"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/talks/{talk_id}",
                    headers=self.headers,
                )
                
                if response.status_code == 200:
                    return response.json()
                return {}
                    
        except Exception as e:
            logger.exception(f"Error getting talk status: {e}")
            return {}
    
    async def list_avatars(self) -> list:
        """List available avatars"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/avatars",
                    headers=self.headers,
                )
                
                if response.status_code == 200:
                    return response.json().get("avatars", [])
                return []
                    
        except Exception as e:
            logger.exception(f"Error listing avatars: {e}")
            return []
    
    async def create_avatar(self, image_url: str, name: str) -> Optional[str]:
        """Create a custom avatar from an image"""
        try:
            payload = {
                "source_url": image_url,
                "name": name,
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.BASE_URL}/avatars",
                    json=payload,
                    headers=self.headers,
                )
                
                if response.status_code == 201:
                    return response.json().get("id")
                return None
                    
        except Exception as e:
            logger.exception(f"Error creating avatar: {e}")
            return None
    
    async def get_avatar(self, avatar_id: str) -> dict:
        """Get avatar details"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/avatars/{avatar_id}",
                    headers=self.headers,
                )
                
                if response.status_code == 200:
                    return response.json()
                return {}
                    
        except Exception as e:
            logger.exception(f"Error getting avatar: {e}")
            return {}
    
    async def delete_avatar(self, avatar_id: str) -> bool:
        """Delete a custom avatar"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.BASE_URL}/avatars/{avatar_id}",
                    headers=self.headers,
                )
                
                return response.status_code == 200
                    
        except Exception as e:
            logger.exception(f"Error deleting avatar: {e}")
            return False
    
    async def list_talks(self, limit: int = 20) -> list:
        """List previous avatar generations"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/talks",
                    headers=self.headers,
                )
                
                if response.status_code == 200:
                    talks = response.json().get("talks", [])
                    return talks[:limit]
                return []
                    
        except Exception as e:
            logger.exception(f"Error listing talks: {e}")
            return []
    
    async def get_credits_usage(self) -> dict:
        """Get current API credits usage"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/credits",
                    headers=self.headers,
                )
                
                if response.status_code == 200:
                    return response.json()
                return {}
                    
        except Exception as e:
            logger.exception(f"Error getting credits: {e}")
            return {}


# Alternative avatar providers (for future implementation)
class AvatarProvider:
    """Factory for avatar providers"""
    
    @staticmethod
    async def create_avatar(
        provider: str,
        image_url: str,
        audio_url: str,
        **kwargs,
    ) -> Optional[str]:
        """Create avatar using specified provider"""
        if provider == "d-id":
            service = DIDService()
            return await service.generate_talking_avatar(image_url, audio_url, **kwargs)
        elif provider == "synthesia":
            # Future: Synthesia integration
            logger.warning("Synthesia provider not yet implemented")
            return None
        elif provider == "heygen":
            # Future: HeyGen integration
            logger.warning("HeyGen provider not yet implemented")
            return None
        else:
            logger.error(f"Unknown avatar provider: {provider}")
            return None
