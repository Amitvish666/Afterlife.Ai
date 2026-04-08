"""
Memory management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.db.models import User, Persona, MemoryItem
from app.core.security import get_current_user
from app.api.schemas import (
    MemoryItemResponse,
    MemoryItemUpdate,
)

router = APIRouter()


@router.get("/{persona_id}/memories", response_model=list[MemoryItemResponse])
async def list_memories(
    persona_id: str,
    category: str = None,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List memories for a persona"""
    persona = await Persona.get(db, persona_id)
    if not persona or persona.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    query = select(MemoryItem).where(
        MemoryItem.persona_id == persona_id,
        MemoryItem.is_active == True,
    )
    
    if category:
        query = query.where(MemoryItem.category == category)
    
    query = query.order_by(MemoryItem.importance.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{persona_id}/memories/{memory_id}", response_model=MemoryItemResponse)
async def get_memory(
    persona_id: str,
    memory_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific memory"""
    memory = await MemoryItem.get(db, memory_id)
    if not memory or memory.persona_id != persona_id:
        raise HTTPException(status_code=404, detail="Memory not found")
    
    return memory


@router.put("/{persona_id}/memories/{memory_id}", response_model=MemoryItemResponse)
async def update_memory(
    persona_id: str,
    memory_id: str,
    data: MemoryItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a memory"""
    memory = await MemoryItem.get(db, memory_id)
    if not memory or memory.persona_id != persona_id:
        raise HTTPException(status_code=404, detail="Memory not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(memory, field, value)
    
    await db.commit()
    await db.refresh(memory)
    
    return memory


@router.delete("/{persona_id}/memories/{memory_id}", status_code=204)
async def delete_memory(
    persona_id: str,
    memory_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a memory"""
    memory = await MemoryItem.get(db, memory_id)
    if not memory or memory.persona_id != persona_id:
        raise HTTPException(status_code=404, detail="Memory not found")
    
    # Soft delete
    memory.is_active = False
    await db.commit()
    
    return None
