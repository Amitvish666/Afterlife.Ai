"""
Analytics service - usage tracking and metrics
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.db.models import (
    User, Persona, MemoryItem, ChatSession, ChatMessage,
    Job, Artifact, AuditLog
)

logger = logging.getLogger(__name__)


class AnalyticsService:
    """
    Analytics and usage tracking service.
    
    Provides:
    - Usage metrics
    - Engagement tracking
    - Performance analytics
    - User activity insights
    """
    
    def __init__(self):
        pass
    
    async def get_user_analytics(
        self,
        db: AsyncSession,
        user_id: str,
        days: int = 30,
    ) -> Dict[str, Any]:
        """Get analytics for a user"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get user stats
        user = await User.get(db, user_id)
        if not user:
            return {"error": "User not found"}
        
        # Count personas
        personas_result = await db.execute(
            select(func.count(Persona.id)).where(Persona.user_id == user_id)
        )
        persona_count = personas_result.scalar() or 0
        
        # Count total memories
        memories_result = await db.execute(
            select(func.count(MemoryItem.id))
            .join(Persona, MemoryItem.persona_id == Persona.id)
            .where(Persona.user_id == user_id)
        )
        memory_count = memories_result.scalar() or 0
        
        # Count chat messages
        messages_result = await db.execute(
            select(func.count(ChatMessage.id))
            .join(ChatSession, ChatMessage.session_id == ChatSession.id)
            .join(Persona, ChatSession.persona_id == Persona.id)
            .where(Persona.user_id == user_id)
            .where(ChatMessage.created_at >= start_date)
        )
        message_count = messages_result.scalar() or 0
        
        # Count total tokens used
        tokens_result = await db.execute(
            select(func.sum(ChatMessage.tokens_used))
            .join(ChatSession, ChatMessage.session_id == ChatSession.id)
            .join(Persona, ChatSession.persona_id == Persona.id)
            .where(Persona.user_id == user_id)
        )
        tokens_used = tokens_result.scalar() or 0
        
        # Get activity by day
        activity_result = await db.execute(
            select(
                func.date(ChatMessage.created_at).label("date"),
                func.count(ChatMessage.id).label("count"),
            )
            .join(ChatSession, ChatMessage.session_id == ChatSession.id)
            .join(Persona, ChatSession.persona_id == Persona.id)
            .where(Persona.user_id == user_id)
            .where(ChatMessage.created_at >= start_date)
            .where(ChatMessage.role == "assistant")
            .group_by(func.date(ChatMessage.created_at))
            .order_by("date")
        )
        activity_by_day = [
            {"date": str(row.date), "messages": row.count}
            for row in activity_result.all()
        ]
        
        return {
            "period": f"last_{days}_days",
            "generated_at": datetime.utcnow().isoformat(),
            "user": {
                "id": user_id,
                "email": user.email,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            },
            "totals": {
                "personas": persona_count,
                "memories": memory_count,
                "chat_messages": message_count,
                "tokens_used": tokens_used,
            },
            "activity": {
                "messages_by_day": activity_by_day,
            },
        }
    
    async def get_persona_analytics(
        self,
        db: AsyncSession,
        persona_id: str,
        days: int = 30,
    ) -> Dict[str, Any]:
        """Get analytics for a persona"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        persona = await Persona.get(db, persona_id)
        if not persona:
            return {"error": "Persona not found"}
        
        # Memory stats
        memories_result = await db.execute(
            select(
                func.count(MemoryItem.id).label("total"),
                func.avg(MemoryItem.importance).label("avg_importance"),
            )
            .where(MemoryItem.persona_id == persona_id)
            .where(MemoryItem.is_active == True)
        )
        memory_stats = memories_result.one()
        
        # Chat stats
        sessions_result = await db.execute(
            select(func.count(ChatSession.id)).where(ChatSession.persona_id == persona_id)
        )
        session_count = sessions_result.scalar() or 0
        
        messages_result = await db.execute(
            select(func.count(ChatMessage.id))
            .join(ChatSession, ChatMessage.session_id == ChatSession.id)
            .where(ChatSession.persona_id == persona_id)
            .where(ChatMessage.created_at >= start_date)
        )
        message_count = messages_result.scalar() or 0
        
        # Memory by category
        category_result = await db.execute(
            select(
                MemoryItem.category,
                func.count(MemoryItem.id),
            )
            .where(MemoryItem.persona_id == persona_id)
            .where(MemoryItem.is_active == True)
            .group_by(MemoryItem.category)
        )
        categories = {row[0] or "unknown": row[1] for row in category_result.all()}
        
        # Last interaction
        last_interaction = persona.last_interaction.isoformat() if persona.last_interaction else None
        
        return {
            "period": f"last_{days}_days",
            "generated_at": datetime.utcnow().isoformat(),
            "persona": {
                "id": persona_id,
                "name": persona.title,
                "status": persona.status,
                "relation": persona.relation,
                "purpose": persona.purpose,
                "created_at": persona.created_at.isoformat() if persona.created_at else None,
                "last_interaction": last_interaction,
            },
            "memories": {
                "total": memory_stats.total or 0,
                "average_importance": round(memory_stats.avg_importance or 0, 2),
                "by_category": categories,
            },
            "chat": {
                "total_sessions": session_count,
                "messages_last_30_days": message_count,
            },
        }
    
    async def get_system_analytics(
        self,
        db: AsyncSession,
        days: int = 7,
    ) -> Dict[str, Any]:
        """Get system-wide analytics (admin only)"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # User stats
        users_result = await db.execute(
            select(func.count(User.id)).where(User.is_active == True)
        )
        active_users = users_result.scalar() or 0
        
        users_created_result = await db.execute(
            select(func.count(User.id)).where(User.created_at >= start_date)
        )
        new_users = users_created_result.scalar() or 0
        
        # Persona stats
        personas_result = await db.execute(
            select(func.count(Persona.id))
        )
        total_personas = personas_result.scalar() or 0
        
        # Memory stats
        memories_result = await db.execute(
            select(func.count(MemoryItem.id)).where(MemoryItem.is_active == True)
        )
        total_memories = memories_result.scalar() or 0
        
        # Chat stats
        messages_result = await db.execute(
            select(func.count(ChatMessage.id))
            .where(ChatMessage.created_at >= start_date)
        )
        messages_period = messages_result.scalar() or 0
        
        # Token usage
        tokens_result = await db.execute(
            select(func.sum(ChatMessage.tokens_used))
            .where(ChatMessage.created_at >= start_date)
        )
        tokens_period = tokens_result.scalar() or 0
        
        # Jobs
        jobs_result = await db.execute(
            select(
                func.count(Job.id),
                func.sum(Job.status == "completed"),
            )
        )
        jobs_stats = jobs_result.one()
        
        return {
            "period": f"last_{days}_days",
            "generated_at": datetime.utcnow().isoformat(),
            "totals": {
                "active_users": active_users,
                "total_personas": total_personas,
                "total_memories": total_memories,
            },
            "period_stats": {
                "new_users": new_users,
                "chat_messages": messages_period,
                "tokens_used": tokens_period,
                "jobs_completed": jobs_stats[1] or 0,
            },
        }
    
    async def track_event(
        self,
        db: AsyncSession,
        user_id: str,
        event_type: str,
        properties: Optional[Dict] = None,
    ):
        """Track an analytics event"""
        event = AuditLog(
            user_id=user_id,
            action=f"analytics_{event_type}",
            resource_type="analytics",
            details=properties or {},
        )
        db.add(event)
        await db.commit()
    
    async def get_recent_activity(
        self,
        db: AsyncSession,
        user_id: str,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """Get recent user activity"""
        result = await db.execute(
            select(AuditLog)
            .where(AuditLog.user_id == user_id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
        )
        
        return [
            {
                "action": a.action,
                "resource_type": a.resource_type,
                "details": a.details,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in result.scalars().all()
        ]


# Singleton instance
analytics_service = AnalyticsService()
