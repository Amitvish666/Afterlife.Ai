"""
Chat Engine - Enhanced RAG-powered chat service with persona memory
"""

import logging
from typing import List, Optional, Dict, Any, AsyncGenerator
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.db.models import (
    Persona, MemoryItem, ChatMessage, ChatSession, 
    Persona as PersonaModel
)
from app.services.embedding_service import EmbeddingService
from app.services.openai_service import OpenAIService
from app.services.ollama_service import OllamaService

logger = logging.getLogger(__name__)

# Enhanced Persona system prompt template with more context
PERSONA_SYSTEM_PROMPT = """You are {persona_name}.

## Identity & Background
- Relation to user: {relation}
- Purpose: {purpose}

## Personality Profile
- Traits: {personality_traits}
- Speech patterns: {speech_patterns}
- Communication style: {communication_style}

## Key Facts & Knowledge
{biography}

## Memories & Experiences
{memories}

## Guidelines - VERY IMPORTANT
1. ALWAYS speak in a NATURAL, CASUAL way like a real {relation} would talk
2. Do NOT sound like an AI, robot, or computer - sound like a REAL human being
3. Use SHORT, CONVERSATIONAL responses (1-3 sentences max)
4. Use everyday language that real people use at home
5. Show warmth through natural expressions, not formal words
6. If you don't know something, say so honestly
7. Talk the way real Indian families talk to each other

Current date: {current_date}
Current conversation: {conversation_context}

Remember: You are {persona_name}. Sound like a REAL human being having a casual conversation with family. NOT like a robot!"""


class ChatEngine:
    """Enhanced chat engine for persona-based conversations with RAG"""
    
    # Response style guidelines based on relation
    RELATION_STYLES = {
        "grandmother": {
            "communication_style": "warm, nurturing, wise, speaks like a real Indian grandmother",
            "example_phrases": ["बाई", "पोती", "धाऊ"],
        },
        "grandfather": {
            "communication_style": "wise, patient, tells stories, gentle guidance",
            "example_phrases": ["नातू", "पोता", "आका"],
        },
        "mother": {
            "communication_style": "caring, protective, supportive, practical",
            "example_phrases": ["मुला", "मुली", "बाळ"],
        },
        "father": {
            "communication_style": "practical, guiding, proud, reserved emotions",
            "example_phrases": ["बाळ", "पोता", "शाब्बास"],
        },
        "friend": {
            "communication_style": "casual, supportive, fun, understanding",
            "example_phrases": ["यार", "भाऊ", "छान"],
        },
        "spouse": {
            "communication_style": "loving, intimate, playful, supportive",
            "example_phrases": ["प्रिय", "जी", "मी तुझ्यावर प्रेम करतो"],
        },
    }
    
    def __init__(self, persona: Persona, db: AsyncSession):
        self.persona = persona
        self.db = db
        # Use Ollama if enabled, otherwise fallback to OpenAI
        if settings.OLLAMA_ENABLED:
            self.ollama_service = OllamaService()
            logger.info(f"Using Ollama with model: {settings.OLLAMA_MODEL}")
        else:
            self.openai_service = OpenAIService()
            logger.info("Using OpenAI for chat")
        self.embedding_service = EmbeddingService()
        self.conversation_history: List[Dict[str, str]] = []
        
    async def get_persona_prompt(self) -> str:
        """Build comprehensive persona system prompt"""
        summary = self.persona.summary or {}
        relation = self.persona.relation or "friend"
        
        # Get style guidelines based on relation
        style = self.RELATION_STYLES.get(
            relation.lower(),
            self.RELATION_STYLES["friend"]
        )
        
        # Get biography from summary
        biography_parts = []
        if summary.get("date_of_birth"):
            biography_parts.append(f"Born: {summary['date_of_birth']}")
        if summary.get("key_facts"):
            biography_parts.extend(summary["key_facts"][:5])
        if summary.get("relationships"):
            biography_parts.append(f"Key relationships: {', '.join(summary['relationships'][:3])}")
        if summary.get("interests"):
            biography_parts.append(f"Interests: {', '.join(summary['interests'][:5])}")
        
        biography = "\n".join(biography_parts) if biography_parts else "No biography data available."
        
        # Get memories with context
        memories = await self._get_relevant_memories(
            query="",  # Get general memories
            limit=10,
            include_categories=True,
        )
        
        memories_text = self._format_memories_for_prompt(memories)
        
        # Build conversation context
        conversation_context = await self._get_conversation_context()
        
        return PERSONA_SYSTEM_PROMPT.format(
            persona_name=self.persona.title,
            relation=relation,
            purpose=self.persona.purpose or "companionship",
            personality_traits=", ".join(
                summary.get("personality_traits", ["kind", "caring"])
            ),
            speech_patterns=", ".join(
                summary.get("speech_patterns", ["warm", "friendly"])
            ),
            communication_style=style["communication_style"],
            biography=biography,
            memories=memories_text or "No specific memories shared yet.",
            conversation_context=conversation_context,
            current_date=datetime.now().strftime("%Y-%m-%d"),
        )
    
    async def _get_relevant_memories(
        self,
        query: str,
        limit: int = 10,
        include_categories: bool = False,
    ) -> List[MemoryItem]:
        """Retrieve memories using semantic search with category filtering"""
        try:
            if query:
                # Semantic search using embeddings
                search_results = await self.embedding_service.search_memories(
                    persona_id=self.persona.id,
                    query=query,
                    limit=limit * 2,  # Get more to filter
                )
                
                # Convert to MemoryItem objects
                memory_ids = [r["id"] for r in search_results]
                if memory_ids:
                    result = await self.db.execute(
                        select(MemoryItem)
                        .where(MemoryItem.id.in_(memory_ids))
                        .where(MemoryItem.is_active == True)
                    )
                    memories = list(result.scalars().all())
                    
                    # Sort by search score
                    id_to_score = {r["id"]: r["score"] for r in search_results}
                    memories.sort(
                        key=lambda m: id_to_score.get(m.id, 0),
                        reverse=True
                    )
                    return memories[:limit]
            
            # Fallback: Get important memories
            result = await self.db.execute(
                select(MemoryItem)
                .where(MemoryItem.persona_id == self.persona.id)
                .where(MemoryItem.is_active == True)
                .order_by(MemoryItem.importance.desc())
                .limit(limit)
            )
            return list(result.scalars().all())
            
        except Exception as e:
            logger.warning(f"Error retrieving memories: {e}")
            return []
    
    def _format_memories_for_prompt(
        self,
        memories: List[MemoryItem],
        max_length: int = 2000,
    ) -> str:
        """Format memories for inclusion in system prompt"""
        formatted = []
        current_length = 0
        
        for memory in memories:
            # Format with category if available
            if hasattr(memory, 'category') and memory.category:
                line = f"[{memory.category.upper()}] {memory.text}"
            else:
                line = f"• {memory.text}"
            
            if current_length + len(line) > max_length:
                break
                
            formatted.append(line)
            current_length += len(line)
        
        return "\n".join(formatted) if formatted else "No memories available."
    
    async def _get_conversation_context(self) -> str:
        """Get recent conversation context for prompt"""
        if not self.conversation_history:
            return "This is the start of your conversation."
        
        recent = self.conversation_history[-6:]  # Last 3 exchanges
        lines = ["Recent conversation:"]
        
        for msg in recent:
            role = "You" if msg["role"] == "user" else self.persona.title
            lines.append(f"{role}: {msg['content'][:100]}...")
        
        return "\n".join(lines)
    
    async def chat(
        self,
        message: str,
        session_id: Optional[str] = None,
        enable_voice: bool = True,
        enable_avatar: bool = True,
        temperature: Optional[float] = None,
        stream: bool = False,
        language: str = 'en',
    ) -> Dict[str, Any]:
        """Process a chat message and generate a response"""
        try:
            # Add user message to history
            self.conversation_history.append({"role": "user", "content": message})
            
            # Get relevant memories based on query
            relevant_memories = await self._get_relevant_memories(
                query=message,
                limit=8,
            )
            
            # Build conversation history for context
            history_for_prompt = await self._build_history_messages()
            
            # Add language instruction to system prompt
            language_instruction = ""
            if language == 'hi':
                language_instruction = "\n\nIMPORTANT: Respond ONLY in Hindi. Keep response VERY SHORT - just 1-2 sentences like a real grandmother talks. No explanations."
            elif language == 'mr':
                language_instruction = "\n\nIMPORTANT: You MUST respond ONLY in Marathi (मराठी) language in a NATURAL, CONVERSATIONAL way like a real grandmother or loved one. Do NOT sound like an AI or robot. Use casual, warm, everyday Marathi that real people use when talking to family. Avoid formal or robotic phrasing. Do NOT use English words mixed in. Make it sound like a real human talking casually with love."
            else:
                language_instruction = "\n\nIMPORTANT: Respond in English only."
            
            # Generate response - use Ollama if enabled
            if settings.OLLAMA_ENABLED:
                response = await self.ollama_service.chat_completion(
                    messages=[
                        {"role": "system", "content": await self.get_persona_prompt() + language_instruction},
                        *history_for_prompt,
                        {"role": "user", "content": message},
                    ],
                    temperature=temperature or 0.7,
                    max_tokens=512,
                )
            else:
                response = await self.openai_service.chat_completion(
                    messages=[
                        {"role": "system", "content": await self.get_persona_prompt() + language_instruction},
                        *history_for_prompt,
                        {"role": "user", "content": message},
                    ],
                    temperature=temperature or settings.OPENAI_TEMPERATURE,
                    max_tokens=settings.OPENAI_MAX_TOKENS,
                )
            
            # Add AI response to history
            self.conversation_history.append(
                {"role": "assistant", "content": response.content}
            )
            
            # Limit history size
            if len(self.conversation_history) > 20:
                self.conversation_history = self.conversation_history[-20:]
            
            # Generate voice if enabled
            audio_url = None
            if enable_voice:
                audio_url = await self._generate_voice(response.content)
            
            # Generate avatar video if enabled
            avatar_video_url = None
            if enable_avatar and audio_url:
                avatar_video_url = await self._generate_avatar(
                    response.content, audio_url
                )
            
            return {
                "content": response.content,
                "audio_url": audio_url,
                "avatar_video_url": avatar_video_url,
                "tokens_used": response.usage.total_tokens if response.usage else 0,
                "retrieved_memories": [
                    {"id": m.id, "text": m.text, "category": getattr(m, 'category', None)}
                    for m in relevant_memories
                ],
            }
            
        except Exception as e:
            logger.exception(f"Error in chat: {e}")
            raise
    
    async def stream_chat(
        self,
        message: str,
        temperature: Optional[float] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream chat response token by token"""
        try:
            # Add user message to history
            self.conversation_history.append({"role": "user", "content": message})
            
            # Build history
            history = await self._build_history_messages()
            
            # Get streaming response - use Ollama if enabled
            if settings.OLLAMA_ENABLED:
                async for chunk in self.ollama_service.stream_chat_completion(
                    messages=[
                        {"role": "system", "content": await self.get_persona_prompt()},
                        *history,
                        {"role": "user", "content": message},
                    ],
                    temperature=temperature or 0.7,
                    max_tokens=512,
                ):
                    yield chunk
            else:
                async for chunk in self.openai_service.stream_chat_completion(
                    messages=[
                        {"role": "system", "content": await self.get_persona_prompt()},
                        *history,
                        {"role": "user", "content": message},
                    ],
                    temperature=temperature or settings.OPENAI_TEMPERATURE,
                    max_tokens=settings.OPENAI_MAX_TOKENS,
                ):
                    yield chunk
            
            # Add assistant message to history (final)
            # Note: In streaming, we'd need to accumulate the full response
            
        except Exception as e:
            logger.exception(f"Error in streaming chat: {e}")
            raise
    
    async def _build_history_messages(self) -> List[Dict[str, str]]:
        """Build conversation history for API"""
        # Include last 10 messages for context
        recent = self.conversation_history[-10:]
        return [
            {"role": msg["role"], "content": msg["content"]}
            for msg in recent
        ]
    
    async def _generate_voice(self, text: str) -> Optional[str]:
        """Generate voice audio for text"""
        try:
            from app.services.elevenlabs_service import ElevenLabsService
            tts_service = ElevenLabsService()
            return await tts_service.text_to_speech(
                text=text,
                voice_id=self.persona.voice_id,
            )
        except Exception as e:
            logger.warning(f"Voice generation failed: {e}")
            return None
    
    async def _generate_avatar(
        self,
        text: str,
        audio_url: str,
    ) -> Optional[str]:
        """Generate avatar video with lip-sync"""
        try:
            from app.services.did_service import DIDService
            avatar_service = DIDService()
            return await avatar_service.generate_talking_avatar(
                image_url=self.persona.avatar_url or "",
                audio_url=audio_url,
            )
        except Exception as e:
            logger.warning(f"Avatar generation failed: {e}")
            return None
    
    async def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        audio_url: Optional[str] = None,
        avatar_video_url: Optional[str] = None,
        tokens_used: int = 0,
    ) -> ChatMessage:
        """Save a chat message to the database"""
        message = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            audio_url=audio_url,
            avatar_video_url=avatar_video_url,
            tokens_used=tokens_used,
        )
        self.db.add(message)
        
        # Update session
        session = await ChatSession.get(self.db, session_id)
        if session:
            session.message_count += 1
            session.updated_at = datetime.utcnow()
            
            # Update persona last interaction
            persona = await PersonaModel.get(self.db, self.persona.id)
            if persona:
                persona.last_interaction = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(message)
        
        return message
    
    async def get_conversation_history(
        self,
        session_id: str,
        limit: int = 50,
    ) -> List[ChatMessage]:
        """Get conversation history for a session"""
        result = await self.db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
            .limit(limit)
        )
        messages = list(result.scalars().all())
        return messages
    
    async def get_memory_stats(self) -> Dict[str, Any]:
        """Get memory statistics for this persona"""
        result = await self.db.execute(
            select(
                func.count(MemoryItem.id).label("total"),
                func.avg(MemoryItem.importance).label("avg_importance"),
            )
            .where(MemoryItem.persona_id == self.persona.id)
            .where(MemoryItem.is_active == True)
        )
        stats = result.one()
        
        # Get category breakdown
        result = await self.db.execute(
            select(
                MemoryItem.category,
                func.count(MemoryItem.id),
            )
            .where(MemoryItem.persona_id == self.persona.id)
            .where(MemoryItem.is_active == True)
            .group_by(MemoryItem.category)
        )
        categories = {row[0] or "unknown": row[1] for row in result.all()}
        
        return {
            "total_memories": stats.total or 0,
            "average_importance": round(stats.avg_importance or 0, 2),
            "by_category": categories,
        }


# Factory function
async def create_chat_engine(
    persona: Persona,
    db: AsyncSession,
) -> ChatEngine:
    """Create a chat engine for a persona"""
    engine = ChatEngine(persona, db)
    return engine
