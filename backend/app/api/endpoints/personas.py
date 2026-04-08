"""
Persona management endpoints
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.db.models import User, Persona, Task
from app.core.security import get_current_user
from app.api.schemas import (
    PersonaCreate,
    PersonaUpdate,
    PersonaResponse,
    PersonaSummary,
    PaginatedResponse,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from app.services.audit_service import log_action

router = APIRouter()


@router.get("", response_model=PaginatedResponse)
async def list_personas(
    page: int = 1,
    limit: int = 20,
    search: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's personas"""
    query = select(Persona).where(
        Persona.user_id == current_user.id,
        Persona.status != "deleted",
    )
    
    if search:
        query = query.where(Persona.title.ilike(f"%{search}%"))
    
    # Count total
    count_query = select(Persona.id).where(
        Persona.user_id == current_user.id,
        Persona.status != "deleted",
    )
    total = len((await db.execute(count_query)).scalars().all())
    
    # Apply pagination
    query = query.order_by(Persona.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    
    result = await db.execute(query)
    personas = list(result.scalars().all())
    
    return PaginatedResponse(
        items=[p for p in personas],
        total=total,
        page=page,
        limit=limit,
        has_more=page * limit < total,
    )


@router.get("/{persona_id}", response_model=PersonaResponse)
async def get_persona(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific persona"""
    persona = await Persona.get(db, persona_id)
    
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Persona not found",
        )
    
    if persona.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this persona",
        )
    
    return persona


@router.post("", response_model=PersonaResponse, status_code=status.HTTP_201_CREATED)
async def create_persona(
    data: PersonaCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new persona"""
    persona = Persona(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        relation=data.relation,
        purpose=data.purpose,
        status="processing",
    )
    
    db.add(persona)
    await db.commit()
    await db.refresh(persona)
    
    await log_action(
        db,
        user_id=current_user.id,
        action="create_persona",
        resource_type="persona",
        resource_id=persona.id,
        details={"title": data.title, "purpose": data.purpose},
    )
    
    return persona


@router.put("/{persona_id}", response_model=PersonaResponse)
async def update_persona(
    persona_id: str,
    data: PersonaUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a persona"""
    persona = await Persona.get(db, persona_id)
    
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Persona not found",
        )
    
    if persona.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this persona",
        )
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(persona, field, value)
    
    persona.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(persona)
    
    return persona


@router.delete("/{persona_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_persona(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a persona (soft delete)"""
    persona = await Persona.get(db, persona_id)
    
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Persona not found",
        )
    
    if persona.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this persona",
        )
    
    # Soft delete
    persona.status = "deleted"
    await db.commit()
    
    await log_action(
        db,
        user_id=current_user.id,
        action="delete_persona",
        resource_type="persona",
        resource_id=persona_id,
    )
    
    return None


@router.get("/{persona_id}/summary", response_model=PersonaSummary)
async def get_persona_summary(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get persona summary"""
    persona = await Persona.get(db, persona_id)
    
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Persona not found",
        )
    
    if persona.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this persona",
        )
    
    # Return stored summary or generate one
    if persona.summary:
        return PersonaSummary(**persona.summary)
    
    return PersonaSummary(name=persona.title)


# ============== Task Endpoints ==============

@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new task"""
    # Verify persona belongs to user
    persona = await Persona.get(db, data.persona_id)
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Persona not found",
        )
    
    if persona.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create tasks for this persona",
        )
    
    task = Task(
        persona_id=data.persona_id,
        user_id=current_user.id,
        type=data.type,
        status="pending",
        progress=0.0,
    )
    
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    return task


@router.get("/tasks", response_model=list[TaskResponse])
async def list_tasks(
    persona_id: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List tasks for current user"""
    query = select(Task).where(Task.user_id == current_user.id)
    
    if persona_id:
        # Verify persona belongs to user
        persona = await Persona.get(db, persona_id)
        if not persona or persona.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Persona not found",
            )
        query = query.where(Task.persona_id == persona_id)
    
    query = query.order_by(Task.created_at.desc())
    
    result = await db.execute(query)
    return list(result.scalars().all())


@router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a task"""
    task = await Task.get(db, task_id)
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    
    if task.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this task",
        )
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    
    task.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(task)
    
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a task"""
    task = await Task.get(db, task_id)
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    
    if task.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this task",
        )
    
    await db.delete(task)
    await db.commit()
    
    return None
