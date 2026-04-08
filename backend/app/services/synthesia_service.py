"""
Synthesia AI Avatar generation service
"""

import logging
from typing import Optional, Dict, Any
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class SynthesiaService:
    """Service for Synthesia AI avatar generation"""
    
    BASE_URL = "https://api.synthesia.io/v2"
    
    def __init__(self):
        self.api_key = settings.SYNTHESIA_API_KEY
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
    
    async def generate_avatar_video(
        self,
        text: str,
        avatar_id: str = "anna_costume1",
        language: str = "en",
        voice_id: Optional[str] = None,
    ) -> Optional[str]:
        """
        Generate an AI avatar video using Synthesia
        
        Args:
            text: The text for the avatar to speak
            avatar_id: The Synthesia avatar ID to use
            language: Language code (en, es, fr, de, etc.)
            voice_id: Optional specific voice ID
        
        Returns:
            URL of the generated video, or None if failed
        """
        try:
            # Map language to Synthesia's voice IDs
            voice_map = {
                "en": "11e5e927-740a-4b79-8ce0-7669185f2e46",  # English
                "es": "d92d4d1a-1a89-4c8d-9b28-1983c8c3e55e",  # Spanish
                "fr": "0d15c7c9-1cb8-4d1b-b5c3-0b3d8b8c4b4b",  # French
                "de": "9d8d8c1b-5b3c-4f7d-9e2c-7f6e8d9c4b4b",  # German
                "it": "8c7d6e5f-4a3b-2c1d-9e8f-6d5c4b3a2e1f",  # Italian
                "pt": "7b6c5d4e-3f2a-1b0c-8d7e-5c4b3a2f1e0d",  # Portuguese
                "ja": "6a5b4c3d-2e1f-0a9b-7c6d-4b3a2e1f0d9c",  # Japanese
                "ko": "5a4b3c2d-1e0f-09a8-6b5c-3a2e1f0d9c8b",  # Korean
                "zh": "4a3b2c1d-0e9f-0897-5a4b-2e1f0d9c8b7a",  # Chinese
            }
            
            # Use provided voice_id or get from language map
            synth_voice_id = voice_id or voice_map.get(language, voice_map["en"])
            
            payload = {
                "title": "Beyond Life AI Avatar",
                "script": {
                    "actorId": avatar_id,
                    "scriptText": text,
                },
                "test": False,  # Set to True for test mode (watermark)
                "caption": False,
                "consents": {
                    "privacy": True,
                    "terms": True,
                },
                "voiceId": synth_voice_id,
            }
            
            async with httpx.AsyncClient(timeout=180.0) as client:
                # Create the video
                response = await client.post(
                    f"{self.BASE_URL}/videos",
                    json=payload,
                    headers=self.headers,
                )
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    video_id = data.get("id")
                    
                    if video_id:
                        # Poll for the video to be ready
                        video_url = await self._wait_for_video(client, video_id)
                        return video_url
                else:
                    logger.error(f"Synthesia API error: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.exception(f"Synthesia avatar generation error: {e}")
            return None
    
    async def _wait_for_video(self, client: httpx.AsyncClient, video_id: str, max_attempts: int = 60, delay: float = 5.0) -> Optional[str]:
        """Wait for video generation to complete"""
        for attempt in range(max_attempts):
            try:
                response = await client.get(
                    f"{self.BASE_URL}/videos/{video_id}",
                    headers=self.headers,
                )
                
                if response.status_code == 200:
                    data = response.json()
                    status = data.get("status")
                    
                    if status == "completed":
                        return data.get("downloadUrl")
                    elif status in ["failed", "error"]:
                        logger.error(f"Video generation failed: {data.get('error')}")
                        return None
                    
                    logger.info(f"Video status: {status}, attempt {attempt + 1}/{max_attempts}")
                    
                await asyncio.sleep(delay)
                
            except Exception as e:
                logger.warning(f"Error polling video status: {e}")
                await asyncio.sleep(delay)
        
        return None
    
    async def list_avatars(self) -> list:
        """List available Synthesia avatars"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}/avatars",
                    headers=self.headers,
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("avatars", [])
                return []
                
        except Exception as e:
            logger.exception(f"Error listing avatars: {e}")
            return []
    
    async def list_voices(self) -> list:
        """List available Synthesia voices"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}/voices",
                    headers=self.headers,
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("voices", [])
                return []
                
        except Exception as e:
            logger.exception(f"Error listing voices: {e}")
            return []



