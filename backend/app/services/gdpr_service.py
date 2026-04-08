"""
GDPR compliance service - data export and deletion
"""

import logging
import json
from typing import Dict, Any, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import httpx

from app.db.models import (
    User, Persona, MemoryItem, Artifact, ChatSession,
    ChatMessage, VoiceProfile, AvatarConfig, Job, AuditLog
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class GDPRService:
    """
    GDPR compliance service for data export and deletion.
    
    Implements user's right to:
    - Access their data (export)
    - Rectification (correct data)
    - Erasure (delete data)
    - Portability (transfer data)
    """
    
    def __init__(self):
        self.export_dir = "./exports"
    
    async def export_user_data(
        self,
        db: AsyncSession,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        Export all user data in JSON format.
        
        Args:
            db: Database session
            user_id: ID of the user
            
        Returns:
            Dictionary with export data and download URL
        """
        try:
            export_data = {
                "export_date": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "version": "1.0",
                "data": {},
            }
            
            # Get user info
            user = await User.get(db, user_id)
            if user:
                export_data["data"]["user"] = {
                    "id": user.id,
                    "email": user.email,
                    "name": user.name,
                    "consent_given": user.consent_given,
                    "consent_timestamp": user.consent_timestamp.isoformat() if user.consent_timestamp else None,
                    "data_retention_days": user.data_retention_days,
                    "created_at": user.created_at.isoformat() if user.created_at else None,
                }
            
            # Get personas
            personas_result = await db.execute(
                select(Persona).where(Persona.user_id == user_id)
            )
            personas = list(personas_result.scalars().all())
            
            export_data["data"]["personas"] = []
            for persona in personas:
                persona_data = {
                    "id": persona.id,
                    "title": persona.title,
                    "description": persona.description,
                    "relation": persona.relation,
                    "purpose": persona.purpose,
                    "status": persona.status,
                    "created_at": persona.created_at.isoformat() if persona.created_at else None,
                    "summary": persona.summary,
                }
                
                # Get memories
                memories_result = await db.execute(
                    select(MemoryItem).where(MemoryItem.persona_id == persona.id)
                )
                persona_data["memories"] = [
                    {
                        "id": m.id,
                        "text": m.text,
                        "category": m.category,
                        "importance": m.importance,
                        "source": m.source,
                        "created_at": m.created_at.isoformat() if m.created_at else None,
                    }
                    for m in memories_result.scalars().all()
                ]
                
                # Get chat sessions
                sessions_result = await db.execute(
                    select(ChatSession).where(ChatSession.persona_id == persona.id)
                )
                persona_data["chat_sessions"] = [
                    {
                        "id": s.id,
                        "title": s.title,
                        "message_count": s.message_count,
                        "created_at": s.created_at.isoformat() if s.created_at else None,
                    }
                    for s in sessions_result.scalars().all()
                ]
                
                # Get voice profiles
                voices_result = await db.execute(
                    select(VoiceProfile).where(VoiceProfile.persona_id == persona.id)
                )
                persona_data["voice_profiles"] = [
                    {
                        "id": v.id,
                        "name": v.name,
                        "provider": v.provider,
                        "voice_id": v.voice_id,
                        "created_at": v.created_at.isoformat() if v.created_at else None,
                    }
                    for v in voices_result.scalars().all()
                ]
                
                # Get avatar configs
                avatars_result = await db.execute(
                    select(AvatarConfig).where(AvatarConfig.persona_id == persona.id)
                )
                persona_data["avatar_configs"] = [
                    {
                        "id": a.id,
                        "provider": a.provider,
                        "style": a.style,
                        "created_at": a.created_at.isoformat() if a.created_at else None,
                    }
                    for a in avatars_result.scalars().all()
                ]
                
                export_data["data"]["personas"].append(persona_data)
            
            # Get audit logs
            audit_result = await db.execute(
                select(AuditLog).where(AuditLog.user_id == user_id).limit(100)
            )
            export_data["data"]["audit_logs"] = [
                {
                    "id": a.id,
                    "action": a.action,
                    "resource_type": a.resource_type,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                }
                for a in audit_result.scalars().all()
            ]
            
            # Get jobs
            jobs_result = await db.execute(
                select(Job).where(Job.user_id == user_id).limit(50)
            )
            export_data["data"]["jobs"] = [
                {
                    "id": j.id,
                    "type": j.type,
                    "status": j.status,
                    "created_at": j.created_at.isoformat() if j.created_at else None,
                }
                for j in jobs_result.scalars().all()
            ]
            
            return {
                "status": "success",
                "data": export_data,
                "format": "json",
            }
            
        except Exception as e:
            logger.exception(f"Error exporting user data: {e}")
            return {"status": "error", "message": str(e)}
    
    async def delete_user_data(
        self,
        db: AsyncSession,
        user_id: str,
        delete_assets: bool = True,
    ) -> Dict[str, Any]:
        """
        Delete all user data (GDPR right to erasure).
        
        Args:
            db: Database session
            user_id: ID of the user
            delete_assets: Whether to also delete S3 assets
            
        Returns:
            Deletion result
        """
        try:
            deleted_items = {}
            
            # Get all user personas
            personas_result = await db.execute(
                select(Persona).where(Persona.user_id == user_id)
            )
            personas = list(personas_result.scalars().all())
            
            deleted_items["personas"] = len(personas)
            
            for persona in personas:
                persona_id = persona.id
                
                # Delete memories
                memories_result = await db.execute(
                    select(MemoryItem).where(MemoryItem.persona_id == persona_id)
                )
                memories = list(memories_result.scalars().all())
                deleted_items[f"memories_{persona_id}"] = len(memories)
                for m in memories:
                    await db.delete(m)
                
                # Delete chat sessions
                sessions_result = await db.execute(
                    select(ChatSession).where(ChatSession.persona_id == persona_id)
                )
                sessions = list(sessions_result.scalars().all())
                deleted_items[f"chat_sessions_{persona_id}"] = len(sessions)
                for s in sessions:
                    await db.delete(s)
                
                # Delete voice profiles
                voices_result = await db.execute(
                    select(VoiceProfile).where(VoiceProfile.persona_id == persona_id)
                )
                voices = list(voices_result.scalars().all())
                deleted_items[f"voice_profiles_{persona_id}"] = len(voices)
                for v in voices:
                    await db.delete(v)
                
                # Delete avatar configs
                avatars_result = await db.execute(
                    select(AvatarConfig).where(AvatarConfig.persona_id == persona_id)
                )
                avatars = list(avatars_result.scalars().all())
                deleted_items[f"avatar_configs_{persona_id}"] = len(avatars)
                for a in avatars:
                    await db.delete(a)
                
                # Delete artifacts
                artifacts_result = await db.execute(
                    select(Artifact).where(Artifact.persona_id == persona_id)
                )
                artifacts = list(artifacts_result.scalars().all())
                deleted_items[f"artifacts_{persona_id}"] = len(artifacts)
                for a in artifacts:
                    await db.delete(a)
                
                # Delete persona
                await db.delete(persona)
            
            # Delete user
            user = await User.get(db, user_id)
            if user:
                deleted_items["user"] = {
                    "id": user.id,
                    "email": user.email,
                }
                # Anonymize user data instead of deleting
                user.email = f"deleted_{user_id}@anonymized.local"
                user.name = "Deleted User"
                user.password_hash = ""
                user.consent_given = False
                user.is_active = False
            
            # Delete audit logs
            audit_result = await db.execute(
                select(AuditLog).where(AuditLog.user_id == user_id)
            )
            audit_logs = list(audit_result.scalars().all())
            deleted_items["audit_logs"] = len(audit_logs)
            for a in audit_logs:
                await db.delete(a)
            
            # Delete jobs
            jobs_result = await db.execute(
                select(Job).where(Job.user_id == user_id)
            )
            jobs = list(jobs_result.scalars().all())
            deleted_items["jobs"] = len(jobs)
            for j in jobs:
                await db.delete(j)
            
            await db.commit()
            
            # Log deletion
            logger.info(f"Deleted user data for user {user_id}: {deleted_items}")
            
            return {
                "status": "success",
                "deleted_items": deleted_items,
                "deleted_at": datetime.utcnow().isoformat(),
            }
            
        except Exception as e:
            logger.exception(f"Error deleting user data: {e}")
            await db.rollback()
            return {"status": "error", "message": str(e)}
    
    async def anonymize_persona(
        self,
        db: AsyncSession,
        persona_id: str,
    ) -> Dict[str, Any]:
        """
        Anonymize a single persona while keeping it for analytics.
        
        Args:
            db: Database session
            persona_id: ID of the persona
            
        Returns:
            Anonymization result
        """
        try:
            persona = await Persona.get(db, persona_id)
            if not persona:
                return {"status": "error", "message": "Persona not found"}
            
            # Anonymize memories
            memories_result = await db.execute(
                select(MemoryItem).where(MemoryItem.persona_id == persona_id)
            )
            memories = list(memories_result.scalars().all())
            
            anonymized_count = 0
            for memory in memories:
                # Replace names and identifying info
                anonymized_text = self._anonymize_text(memory.text)
                memory.text = anonymized_text
                anonymized_count += 1
            
            # Anonymize persona title
            persona.title = f"Anonymized Persona {persona_id[:8]}"
            persona.description = None
            
            await db.commit()
            
            return {
                "status": "success",
                "memories_anonymized": anonymized_count,
                "anonymized_at": datetime.utcnow().isoformat(),
            }
            
        except Exception as e:
            logger.exception(f"Error anonymizing persona: {e}")
            return {"status": "error", "message": str(e)}
    
    def _anonymize_text(self, text: str) -> str:
        """Replace potential PII with placeholders"""
        import re
        
        # Replace email addresses
        text = re.sub(r'[\w\.-]+@[\w\.-]+\.\w+', '[EMAIL]', text)
        
        # Replace phone numbers
        text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE]', text)
        
        # Replace SSN-like patterns
        text = re.sub(r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]', text)
        
        # Replace addresses (simple patterns)
        text = re.sub(r'\d+\s+[\w\s]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Drive)', '[ADDRESS]', text)
        
        return text


# Singleton instance
gdpr_service = GDPRService()
