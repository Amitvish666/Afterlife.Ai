"""
Ollama Service - Local LLM inference using Ollama
"""

import logging
import json
from typing import List, Dict, Any, Optional, AsyncGenerator
from dataclasses import dataclass

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class OllamaResponse:
    """Response from Ollama"""
    content: str
    model: str
    done: bool
    usage: Optional[Dict[str, int]] = None


class OllamaService:
    """Service for interacting with Ollama local LLM"""
    
    def __init__(
        self,
        base_url: str = None,
        model: str = None,
    ):
        self.base_url = base_url or settings.OLLAMA_BASE_URL
        self.model = model or settings.OLLAMA_MODEL
        self.temperature = settings.OLLAMA_TEMPERATURE
        self.max_tokens = settings.OLLAMA_MAX_TOKENS
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = None,
        max_tokens: int = None,
    ) -> OllamaResponse:
        """
        Generate a chat completion using Ollama
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature (0.0 to 2.0)
            max_tokens: Maximum tokens to generate
            
        Returns:
            OllamaResponse with generated content
        """
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                # Convert messages format for Ollama
                ollama_messages = []
                for msg in messages:
                    # Handle system messages - Ollama uses 'system' role directly
                    role = msg.get("role", "user")
                    if role == "assistant":
                        role = "assistant"
                    elif role == "user":
                        role = "user"
                    else:
                        role = "system"
                    
                    ollama_messages.append({
                        "role": role,
                        "content": msg.get("content", "")
                    })
                
                payload = {
                    "model": self.model,
                    "messages": ollama_messages,
                    "stream": False,
                    "options": {
                        "temperature": temperature or self.temperature,
                        "num_predict": max_tokens or self.max_tokens,
                    }
                }
                
                logger.info(f"Calling Ollama at {self.base_url}/api/chat with model {self.model}")
                
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json=payload,
                )
                
                if response.status_code != 200:
                    logger.error(f"Ollama error: {response.status_code} - {response.text}")
                    raise Exception(f"Ollama API error: {response.status_code}")
                
                data = response.json()
                
                return OllamaResponse(
                    content=data.get("message", {}).get("content", ""),
                    model=data.get("model", self.model),
                    done=data.get("done", True),
                    usage=data.get("eval_count"),  # Token usage approximation
                )
                
        except Exception as e:
            logger.exception(f"Error calling Ollama: {e}")
            raise
    
    async def stream_chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = None,
        max_tokens: int = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat completion from Ollama
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            
        Yields:
            Content chunks as they're generated
        """
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                # Convert messages format for Ollama
                ollama_messages = []
                for msg in messages:
                    role = msg.get("role", "user")
                    if role == "assistant":
                        role = "assistant"
                    elif role == "user":
                        role = "user"
                    else:
                        role = "system"
                    
                    ollama_messages.append({
                        "role": role,
                        "content": msg.get("content", "")
                    })
                
                payload = {
                    "model": self.model,
                    "messages": ollama_messages,
                    "stream": True,
                    "options": {
                        "temperature": temperature or self.temperature,
                        "num_predict": max_tokens or self.max_tokens,
                    }
                }
                
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/chat",
                    json=payload,
                ) as response:
                    if response.status_code != 200:
                        logger.error(f"Ollama streaming error: {response.status_code}")
                        raise Exception(f"Ollama streaming error: {response.status_code}")
                    
                    async for line in response.aiter_lines():
                        if line.strip():
                            try:
                                data = json.loads(line)
                                if "message" in data and "content" in data["message"]:
                                    content = data["message"]["content"]
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                continue
                                
        except Exception as e:
            logger.exception(f"Error in Ollama streaming: {e}")
            raise
    
    async def generate(
        self,
        prompt: str,
        temperature: float = None,
        max_tokens: int = None,
    ) -> OllamaResponse:
        """
        Generate text using the /api/generate endpoint
        
        Args:
            prompt: The prompt to generate from
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            
        Returns:
            OllamaResponse with generated content
        """
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                payload = {
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": temperature or self.temperature,
                        "num_predict": max_tokens or self.max_tokens,
                    }
                }
                
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json=payload,
                )
                
                if response.status_code != 200:
                    raise Exception(f"Ollama generate error: {response.status_code}")
                
                data = response.json()
                
                return OllamaResponse(
                    content=data.get("response", ""),
                    model=data.get("model", self.model),
                    done=data.get("done", True),
                )
                
        except Exception as e:
            logger.exception(f"Error in Ollama generate: {e}")
            raise
    
    async def check_health(self) -> bool:
        """
        Check if Ollama is running and accessible
        
        Returns:
            True if Ollama is healthy
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception:
            return False
    
    async def list_models(self) -> List[Dict[str, Any]]:
        """
        List available models in Ollama
        
        Returns:
            List of model info dicts
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    return data.get("models", [])
                return []
        except Exception as e:
            logger.error(f"Error listing Ollama models: {e}")
            return []
