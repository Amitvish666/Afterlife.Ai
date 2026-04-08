"""
Audit logging service
"""

import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models import AuditLog

logger = logging.getLogger(__name__)


async def log_action(
    db: AsyncSession,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Optional[AuditLog]:
    """Log an audit action"""
    try:
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        
        db.add(audit_log)
        await db.commit()
        
        return audit_log
        
    except Exception as e:
        logger.exception(f"Audit log error: {e}")
        return None


class AuditService:
    """Audit service for querying audit logs"""
    
    @staticmethod
    async def get_user_logs(
        db: AsyncSession,
        user_id: str,
        limit: int = 100,
        offset: int = 0,
    ) -> list[AuditLog]:
        """Get audit logs for a user"""
        query = select(AuditLog).where(
            AuditLog.user_id == user_id
        ).order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
        
        result = await db.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def get_resource_logs(
        db: AsyncSession,
        resource_type: str,
        resource_id: str,
    ) -> list[AuditLog]:
        """Get audit logs for a specific resource"""
        query = select(AuditLog).where(
            AuditLog.resource_type == resource_type,
            AuditLog.resource_id == resource_id,
        ).order_by(AuditLog.created_at.desc())
        
        result = await db.execute(query)
        return list(result.scalars().all())
