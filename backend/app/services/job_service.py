"""
Background job service for processing long-running tasks
"""

import logging
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models import Job, User, Persona
from app.core.config import settings

logger = logging.getLogger(__name__)


class JobService:
    """Service for managing background jobs"""
    
    JOB_TYPES = [
        "transcription",
        "embedding",
        "memory_extraction",
        "voice_clone",
        "avatar_generate",
        "persona_build",
        "file_process",
    ]
    
    def __init__(self):
        self.jobs: Dict[str, Job] = {}
        self.job_results: Dict[str, Any] = {}
    
    async def create_job(
        self,
        db: AsyncSession,
        user_id: str,
        job_type: str,
        persona_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Job:
        """Create a new background job"""
        job = Job(
            id=f"job_{datetime.utcnow().timestamp()}",
            user_id=user_id,
            persona_id=persona_id,
            type=job_type,
            status="pending",
            progress=0.0,
            metadata=metadata or {},
        )
        
        db.add(job)
        await db.commit()
        await db.refresh(job)
        
        # Start processing in background
        asyncio.create_task(self._process_job(job.id, db))
        
        return job
    
    async def get_job(self, db: AsyncSession, job_id: str) -> Optional[Job]:
        """Get job by ID"""
        result = await db.execute(
            select(Job).where(Job.id == job_id)
        )
        return result.scalar_one_or_none()
    
    async def update_job_progress(
        self,
        db: AsyncSession,
        job_id: str,
        progress: float,
        status: Optional[str] = None,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
    ) -> Optional[Job]:
        """Update job progress"""
        job = await self.get_job(db, job_id)
        if not job:
            return None
        
        job.progress = progress
        if status:
            job.status = status
        if result:
            job.result = result
        if error:
            job.error = error
        
        job.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(job)
        
        return job
    
    async def _process_job(self, job_id: str, db: AsyncSession):
        """Process a job in the background"""
        try:
            job = await self.get_job(db, job_id)
            if not job:
                return
            
            job.status = "processing"
            await db.commit()
            
            # Route to appropriate handler
            if job.type == "transcription":
                await self._process_transcription(job, db)
            elif job.type == "embedding":
                await self._process_embedding(job, db)
            elif job.type == "memory_extraction":
                await self._process_memory_extraction(job, db)
            elif job.type == "file_process":
                await self._process_file(job, db)
            else:
                await self._run_generic_job(job, db)
                
        except Exception as e:
            logger.exception(f"Error processing job {job_id}: {e}")
            await self.update_job_progress(
                db, job_id, 1.0, status="failed", error=str(e)
            )
    
    async def _process_file(self, job: Job, db: AsyncSession):
        """Process uploaded file - transcription, OCR, etc."""
        from app.services.memory_processor import memory_processor
        
        job.metadata = job.metadata or {}
        artifact_id = job.metadata.get("artifact_id")
        
        await self.update_job_progress(db, job.id, 0.1, status="processing")
        
        # Process based on file type
        result = await memory_processor.process_artifact(
            db=db,
            artifact_id=artifact_id,
            persona_id=job.persona_id,
            progress_callback=lambda p: asyncio.create_task(
                self.update_job_progress(db, job.id, p)
            ),
        )
        
        await self.update_job_progress(
            db, job.id, 1.0, status="completed", result=result
        )
        
        # Update persona memory count
        if job.persona_id:
            from app.db.models import Persona
            persona = await Persona.get(db, job.persona_id)
            if persona:
                from sqlalchemy import select, func
                result = await db.execute(
                    select(func.count("*")).select_from(
                        __import__("app.db.models", fromlist=["MemoryItem"]).MemoryItem
                    ).where(
                        __import__("app.db.models", fromlist=["MemoryItem"]).MemoryItem.persona_id == job.persona_id,
                        __import__("app.db.models", fromlist=["MemoryItem"]).MemoryItem.is_active == True
                    )
                )
                count = result.scalar() or 0
                persona.memory_count = count
                await db.commit()
    
    async def _process_transcription(self, job: Job, db: AsyncSession):
        """Process audio/video transcription"""
        from app.services.openai_service import OpenAIService
        
        job.metadata = job.metadata or {}
        audio_url = job.metadata.get("audio_url")
        
        await self.update_job_progress(db, job.id, 0.2)
        
        openai_service = OpenAIService()
        transcript = await openai_service.transcription(audio_url)
        
        await self.update_job_progress(db, job.id, 0.5)
        
        # Save transcription as memory
        if job.persona_id:
            from app.db.models import MemoryItem, ProcessedText, Artifact
            
            # Create processed text record
            processed_text = ProcessedText(
                artifact_id=job.metadata.get("artifact_id"),
                text_content=transcript["text"],
                language=transcript.get("language", "en"),
                word_count=len(transcript["text"].split()),
            )
            db.add(processed_text)
            await db.commit()
            await db.refresh(processed_text)
            
            # Update artifact
            artifact = await Artifact.get(db, job.metadata.get("artifact_id"))
            if artifact:
                artifact.status = "ready"
                artifact.processed_text_id = processed_text.id
                await db.commit()
        
        await self.update_job_progress(
            db, job.id, 1.0, status="completed", result=transcript
        )
    
    async def _process_embedding(self, job: Job, db: AsyncSession):
        """Process text embedding generation"""
        await self.update_job_progress(db, job.id, 0.3)
        
        # Embeddings are handled by memory processor
        await self.update_job_progress(db, job.id, 1.0, status="completed")
    
    async def _process_memory_extraction(self, job: Job, db: AsyncSession):
        """Extract structured memories from text"""
        from app.services.memory_processor import memory_processor
        
        job.metadata = job.metadata or {}
        text = job.metadata.get("text")
        source = job.metadata.get("source")
        
        await self.update_job_progress(db, job.id, 0.3)
        
        memories = await memory_processor.extract_memories(
            text=text,
            persona_id=job.persona_id,
            source=source,
        )
        
        await self.update_job_progress(
            db, job.id, 1.0, status="completed", result={"memories": memories}
        )
    
    async def _run_generic_job(self, job: Job, db: AsyncSession):
        """Run generic job with progress updates"""
        await self.update_job_progress(db, job.id, 0.0)
        
        for i in range(1, 11):
            await asyncio.sleep(0.1)
            await self.update_job_progress(db, job.id, i * 0.1)
        
        await self.update_job_progress(db, job.id, 1.0, status="completed")


# Singleton instance
job_service = JobService()
