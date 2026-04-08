"""
OpenAI service for LLM and embeddings with streaming support
"""

import logging
from typing import Optional, List, Dict, Any, AsyncGenerator
from openai import OpenAI, AsyncOpenAI
from openai.types.chat import ChatCompletion
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)


class OpenAIResponse(BaseModel):
    """OpenAI response wrapper"""
    content: str
    usage: Optional[Any] = None
    model: str


class OpenAIService:
    """Service for OpenAI API calls with streaming support"""
    
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.async_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4000,
        model: Optional[str] = None,
    ) -> OpenAIResponse:
        """Generate chat completion"""
        try:
            response = await self.async_client.chat.completions.create(
                model=model or settings.OPENAI_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            
            return OpenAIResponse(
                content=response.choices[0].message.content or "",
                usage=response.usage,
                model=response.model,
            )
        except Exception as e:
            logger.exception(f"OpenAI chat completion error: {e}")
            raise
    
    async def stream_chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4000,
        model: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Generate streaming chat completion"""
        try:
            stream = await self.async_client.chat.completions.create(
                model=model or settings.OPENAI_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.exception(f"OpenAI streaming chat error: {e}")
            raise
    
    async def text_embedding(
        self,
        text: str,
        model: Optional[str] = None,
    ) -> List[float]:
        """Generate text embedding"""
        try:
            response = await self.async_client.embeddings.create(
                model=model or settings.OPENAI_EMBEDDING_MODEL,
                input=text,
            )
            return response.data[0].embedding
        except Exception as e:
            logger.exception(f"OpenAI embedding error: {e}")
            raise
    
    async def text_embeddings(
        self,
        texts: List[str],
        model: Optional[str] = None,
    ) -> List[List[float]]:
        """Generate multiple text embeddings"""
        try:
            response = await self.async_client.embeddings.create(
                model=model or settings.OPENAI_EMBEDDING_MODEL,
                input=texts,
            )
            return [data.embedding for data in response.data]
        except Exception as e:
            logger.exception(f"OpenAI embeddings error: {e}")
            raise
    
    async def transcription(
        self,
        audio_file,
        model: str = "whisper-1",
        language: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Transcribe audio using Whisper"""
        try:
            response = await self.async_client.audio.transcriptions.create(
                file=audio_file,
                model=model,
                language=language,
                response_format="verbose",
            )
            return {
                "text": response.text,
                "duration": response.duration,
                "language": response.language,
                "segments": getattr(response, "segments", []),
            }
        except Exception as e:
            logger.exception(f"OpenAI transcription error: {e}")
            raise
    
    async def structured_output(
        self,
        messages: List[Dict[str, str]],
        response_format: Dict[str, Any],
        temperature: float = 0.2,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate structured JSON output"""
        try:
            response = await self.async_client.chat.completions.create(
                model=model or settings.OPENAI_MODEL,
                messages=messages,
                temperature=temperature,
                response_format=response_format,
            )
            import json
            content = response.choices[0].message.content
            return json.loads(content) if content else {}
        except Exception as e:
            logger.exception(f"OpenAI structured output error: {e}")
            raise
    
    async def analyze_text(
        self,
        text: str,
        task: str,
        instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Analyze text using GPT for various tasks"""
        tasks = {
            "summarize": "Summarize the key points of this text concisely.",
            "extract_entities": "Extract and list all named entities (people, places, organizations, dates) from this text.",
            "sentiment": "Analyze the sentiment of this text. Respond with JSON: {\"sentiment\": \"positive|neutral|negative\", \"confidence\": 0.0-1.0, \"reason\": \"...\"}",
            "categorize": "Categorize this text into one or more of: personal_fact, relationship, preference, memory, quote, behavior, opinion, skill. Respond with JSON: {\"categories\": [...], \"reason\": \"...\"}",
            "importance": "Rate the importance of this information on a scale of 0.0-1.0. Respond with JSON: {\"importance\": 0.0-1.0, \"reason\": \"...\"}",
        }
        
        prompt = tasks.get(task, instructions or tasks["summarize"])
        
        return await self.structured_output(
            messages=[
                {"role": "system", "content": f"{prompt}\n\nAnalyze this text:\n{text}"},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
    
    async def generate_image(
        self,
        prompt: str,
        size: str = "1024x1024",
        quality: str = "standard",
        model: str = "dall-e-3",
    ) -> Optional[str]:
        """Generate an image using DALL-E"""
        try:
            response = await self.async_client.images.generate(
                model=model,
                prompt=prompt,
                size=size,
                quality=quality,
                n=1,
            )
            return response.data[0].url
        except Exception as e:
            logger.exception(f"OpenAI image generation error: {e}")
            return None
