"""
User management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import User
from app.core.security import get_current_user
from app.api.schemas import (
    UserResponse,
    UserUpdate,
    ConsentRequest,
)
from app.services.audit_service import log_action

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """Get current user information"""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user"""
    update_data = data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    await log_action(
        db,
        user_id=current_user.id,
        action="update_profile",
        resource_type="user",
        resource_id=current_user.id,
        details={"fields": list(update_data.keys())},
    )
    
    return current_user


@router.post("/consent")
async def update_consent(
    data: ConsentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user consent settings"""
    from datetime import datetime
    
    current_user.consent_given = data.consent_given
    current_user.data_retention_days = data.data_retention_days
    if data.consent_given:
        current_user.consent_timestamp = datetime.utcnow()
    
    await db.commit()
    
    await log_action(
        db,
        user_id=current_user.id,
        action="update_consent",
        resource_type="user",
        resource_id=current_user.id,
        details={"consent_given": data.consent_given},
    )
    
    return {"message": "Consent updated successfully"}


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete current user account"""
    await log_action(
        db,
        user_id=current_user.id,
        action="delete_account",
        resource_type="user",
        resource_id=current_user.id,
    )
    
    # Delete all user data
    await db.delete(current_user)
    await db.commit()
    
    return None
