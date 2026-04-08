"""
Memory processor service - extracts structured memories from various file types
"""

import logging
import uuid
from typing import List, Dict, Any, Optional, Callable
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import (
    Persona, Artifact, MemoryItem, ProcessedText, Job
)
from app.services.openai_service import OpenAIService
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)


class MemoryProcessor:
    """
    Processes artifacts and extracts memories using AI.
    
    Pipeline:
    1. Download file from S3
    2. Extract text (transcription, OCR, or direct reading)
    3. Chunk text into manageable pieces
    4. Use AI to extract structured memories
    5. Generate embeddings for each memory
    6. Store memories in database and vector store
    """
    
    # Memory categories for classification
    MEMORY_CATEGORIES = [
        "personal_fact",      # Birth date, places lived, education, career
        "relationship",        # Family, friends, romantic relationships
        "preference",          # Likes, dislikes, hobbies, interests
        "memory",              # Specific events and experiences
        "quote",               # Famous sayings or personal quotes
        "behavior",            # Personality traits and behaviors
        "opinion",             # Views on various topics
        "skill",               # Talents, abilities, expertise
    ]
    
    def __init__(self):
        self.openai_service = OpenAIService()
        self.storage_service = StorageService()
        self.chunk_size = 1000  # characters per chunk
        self.chunk_overlap = 100  # overlap between chunks
    
    async def process_artifact(
        self,
        db: AsyncSession,
        artifact_id: str,
        persona_id: str,
        progress_callback: Optional[Callable[[float], None]] = None,
    ) -> Dict[str, Any]:
        """
        Process an artifact and extract memories.
        
        Args:
            db: Database session
            artifact_id: ID of the artifact to process
            persona_id: ID of the persona this artifact belongs to
            progress_callback: Optional callback for progress updates
            
        Returns:
            Dictionary with processing results
        """
        try:
            # Get artifact
            artifact = await Artifact.get(db, artifact_id)
            if not artifact:
                raise ValueError(f"Artifact {artifact_id} not found")
            
            artifact.status = "processing"
            await db.commit()
            
            if progress_callback:
                progress_callback(0.1)
            
            # Get file from S3
            file_content = await self.storage_service.get_file(artifact.s3_key)
            
            # Extract text based on file type
            text_content = ""
            metadata = {}
            
            if artifact.file_type == "audio":
                text_content, metadata = await self._transcribe_audio(
                    file_content, artifact.mime_type
                )
            elif artifact.file_type == "video":
                text_content, metadata = await self._extract_video_audio(
                    file_content, artifact.mime_type
                )
            elif artifact.file_type == "image":
                text_content, metadata = await self._extract_text_from_image(
                    file_content, artifact.mime_type
                )
            elif artifact.file_type == "text":
                text_content = file_content.decode("utf-8")
                metadata = {"encoding": "utf-8"}
            
            if progress_callback:
                progress_callback(0.3)
            
            if not text_content.strip():
                artifact.status = "error"
                artifact.file_metadata = {"error": "No text content extracted"}
                await db.commit()
                return {"status": "error", "message": "No text content extracted"}
            
            # Save processed text
            processed_text = ProcessedText(
                artifact_id=artifact_id,
                text_content=text_content,
                language=metadata.get("language", "en"),
                word_count=len(text_content.split()),
            )
            db.add(processed_text)
            await db.commit()
            await db.refresh(processed_text)
            
            if progress_callback:
                progress_callback(0.4)
            
            # Chunk text
            chunks = self._chunk_text(text_content)
            
            if progress_callback:
                progress_callback(0.5)
            
            # Extract memories from chunks
            all_memories = []
            for i, chunk in enumerate(chunks):
                memories = await self._extract_memories_from_chunk(
                    text=chunk,
                    persona_id=persona_id,
                    source=artifact.original_filename,
                    chunk_index=i,
                )
                all_memories.extend(memories)
                
                if progress_callback:
                    progress = 0.5 + (0.4 * (i + 1) / len(chunks))
                    progress_callback(min(progress, 0.9))
            
            # Save memories to database and vector store
            for memory in all_memories:
                db.add(memory)
            
            await db.commit()
            
            # Generate embeddings and index
            if all_memories:
                await self._index_memories(
                    db=db,
                    memories=all_memories,
                    persona_id=persona_id,
                )
            
            # Update artifact
            artifact.status = "ready"
            artifact.processed_text_id = processed_text.id
            await db.commit()
            
            if progress_callback:
                progress_callback(1.0)
            
            return {
                "status": "completed",
                "memories_extracted": len(all_memories),
                "chunks_processed": len(chunks),
                "word_count": len(text_content.split()),
                "language": metadata.get("language", "en"),
            }
            
        except Exception as e:
            logger.exception(f"Error processing artifact {artifact_id}: {e}")
            
            artifact = await Artifact.get(db, artifact_id)
            if artifact:
                artifact.status = "error"
                artifact.file_metadata = {"error": str(e)}
                await db.commit()
            
            return {"status": "error", "message": str(e)}
    
    async def _transcribe_audio(
        self,
        file_content: bytes,
        mime_type: str,
    ) -> tuple[str, dict]:
        """Transcribe audio using OpenAI Whisper"""
        import io
        from app.services.openai_service import OpenAIService
        
        openai_service = OpenAIService()
        
        # Create file-like object for API
        audio_file = io.BytesIO(file_content)
        
        result = await openai_service.transcription(audio_file)
        
        return result["text"], {
            "language": result.get("language", "en"),
            "duration": result.get("duration", 0),
            "type": "whisper_transcription",
        }
    
    async def _extract_video_audio(
        self,
        file_content: bytes,
        mime_type: str,
    ) -> tuple[str, dict]:
        """Extract audio from video and transcribe"""
        # For video, we need to extract audio first
        # This is a simplified version - in production, use ffmpeg
        import io
        
        # Save video temporarily
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        
        try:
            # Extract audio using ffmpeg (if available)
            audio_path = tmp_path.replace(".mp4", ".wav")
            
            import subprocess
            result = subprocess.run(
                [
                    "ffmpeg", "-y", "-i", tmp_path,
                    "-vn", "-acodec", "pcm_s16le",
                    "-ar", "16000", "-ac", "1", audio_path
                ],
                capture_output=True,
                text=True,
            )
            
            if result.returncode != 0:
                # FFmpeg not available, return placeholder
                return "Video transcription requires audio extraction. Please upload audio separately.", {
                    "type": "placeholder",
                    "note": "Audio extraction not available",
                }
            
            # Read extracted audio
            with open(audio_path, "rb") as f:
                audio_content = f.read()
            
            # Transcribe
            text, metadata = await self._transcribe_audio(audio_content, "audio/wav")
            
            # Cleanup
            os.unlink(audio_path)
            
            return text, {**metadata, "type": "video_extraction"}
            
        finally:
            os.unlink(tmp_path)
    
    async def _extract_text_from_image(
        self,
        file_content: bytes,
        mime_type: str,
    ) -> tuple[str, dict]:
        """Extract text from image using OCR"""
        # Use OpenAI Vision or a dedicated OCR service
        # For now, return placeholder
        return "Image OCR processing. Upload a document format for better results.", {
            "type": "ocr_placeholder",
            "note": "OCR not fully implemented",
        }
    
    def _chunk_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks"""
        chunks = []
        start = 0
        
        while start < len(text):
            end = min(start + self.chunk_size, len(text))
            
            # Try to break at sentence boundary
            if end < len(text):
                # Find last period or sentence break
                last_period = text.rfind(".", start, end)
                last_newline = text.rfind("\n", start, end)
                break_point = max(last_period, last_newline)
                
                if break_point > start + self.chunk_size // 2:
                    end = break_point + 1
            
            chunks.append(text[start:end].strip())
            start = end - self.chunk_overlap
        
        return chunks
    
    async def _extract_memories_from_chunk(
        self,
        text: str,
        persona_id: str,
        source: str,
        chunk_index: int = 0,
    ) -> List[MemoryItem]:
        """Extract structured memories from a text chunk using AI"""
        
        # Create extraction prompt
        system_prompt = """You are a memory extraction assistant. Your task is to extract 
        meaningful memories and facts from text about a person's life.
        
        For each memory, identify:
        1. The content of the memory
        2. Category (personal_fact, relationship, preference, memory, quote, behavior, opinion, skill)
        3. Importance score (0.0 to 1.0)
        4. Any specific time or date mentioned
        
        Return memories as a JSON array of objects with fields:
        - text: The memory content
        - category: One of the specified categories
        - importance: Score from 0.0 to 1.0
        - timestamp: Any date/time mentioned (ISO format if possible)
        
        Focus on extracting:
        - Personal details (birth, education, career)
        - Relationships (family, friends)
        - Preferences and interests
        - Life events and experiences
        - Character traits and behaviors
        - Skills and accomplishments
        """
        
        user_prompt = f"""Extract memories from this text about a person's life:

{text}

Source: {source}
Chunk: {chunk_index + 1}

Extract up to 5 meaningful memories. Format as JSON array."""
        
        try:
            response = await self.openai_service.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=2000,
            )
            
            # Parse JSON response
            import json
            try:
                memories_data = json.loads(response.content)
            except json.JSONDecodeError:
                # Try to extract JSON from response
                start = response.content.find("[")
                end = response.content.rfind("]") + 1
                if start >= 0 and end > start:
                    memories_data = json.loads(response.content[start:end])
                else:
                    memories_data = []
            
            # Create MemoryItem objects
            memories = []
            for mem_data in memories_data:
                memory = MemoryItem(
                    id=f"mem_{uuid.uuid4().hex[:12]}",
                    persona_id=persona_id,
                    text=mem_data.get("text", ""),
                    source=source,
                    source_type="extracted",
                    timestamp=datetime.fromisoformat(mem_data.get("timestamp").replace("Z", "+00:00"))
                    if mem_data.get("timestamp")
                    else None,
                    importance=mem_data.get("importance", 0.5),
                    category=mem_data.get("category", "memory"),
                )
                memories.append(memory)
            
            return memories
            
        except Exception as e:
            logger.warning(f"Error extracting memories from chunk: {e}")
            return []
    
    async def extract_memories(
        self,
        text: str,
        persona_id: str,
        source: str = "manual",
    ) -> List[Dict[str, Any]]:
        """Extract memories from raw text (without saving to DB)"""
        chunks = self._chunk_text(text)
        
        all_memories = []
        for i, chunk in enumerate(chunks):
            memories = await self._extract_memories_from_chunk(
                text=chunk,
                persona_id=persona_id,
                source=source,
                chunk_index=i,
            )
            all_memories.extend([
                {
                    "id": m.id,
                    "text": m.text,
                    "category": m.category,
                    "importance": m.importance,
                    "source": m.source,
                }
                for m in memories
            ])
        
        return all_memories
    
    async def _index_memories(
        self,
        db: AsyncSession,
        memories: List[MemoryItem],
        persona_id: str,
    ) -> bool:
        """Generate embeddings and index memories in vector store"""
        from app.services.embedding_service import EmbeddingService
        
        embedding_service = EmbeddingService()
        
        # Prepare memories for indexing
        memory_dicts = [
            {
                "id": m.id,
                "text": m.text,
                "persona_id": persona_id,
                "category": m.category,
                "importance": m.importance,
            }
            for m in memories
        ]
        
        # Index in vector store
        success = await embedding_service.index_memories(memory_dicts)
        
        if success:
            logger.info(f"Indexed {len(memories)} memories for persona {persona_id}")
        
        return success
    
    async def categorize_memories(
        self,
        db: AsyncSession,
        memories: List[MemoryItem],
    ) -> List[MemoryItem]:
        """Re-categorize existing memories using AI"""
        from app.services.openai_service import OpenAIService
        
        openai_service = OpenAIService()
        
        for memory in memories:
            prompt = f"""Categorize this memory and assign importance:

Memory: {memory.text}
Current category: {memory.category}

Choose the best category from:
- personal_fact: Birth, education, career, locations
- relationship: Family, friends, romantic
- preference: Likes, dislikes, hobbies
- memory: Specific events and experiences
- quote: Saying or expression
- behavior: Personality trait or habit
- opinion: View or perspective
- skill: Talent or ability

Respond with JSON: {{"category": "...", "importance": 0.0-1.0}}"""

            try:
                response = await openai_service.chat_completion(
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.2,
                    max_tokens=100,
                )
                
                import json
                result = json.loads(response.content)
                
                memory.category = result.get("category", memory.category)
                memory.importance = result.get("importance", memory.importance)
                
            except Exception as e:
                logger.warning(f"Error categorizing memory {memory.id}: {e}")
        
        await db.commit()
        return memories


# Singleton instance
memory_processor = MemoryProcessor()
