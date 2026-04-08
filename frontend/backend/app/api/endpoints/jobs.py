"""
Job management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.db.models import User, Job
from app.core.security import get_current_user
from app.api.schemas import JobResponse

router = APIRouter()


@router.get("", response_model=list[JobResponse])
async def list_jobs(
    status: str = None,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List jobs for current user"""
    query = select(Job).where(Job.user_id == current_user.id)
    
    if status:
        query = query.where(Job.status == status)
    
    query = query.order_by(Job.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get job status"""
    job = await Job.get(db, job_id)
    
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job


@router.delete("/{job_id}", status_code=204)
async def delete_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a completed or failed job"""
    job = await Job.get(db, job_id)
    
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Only allow deleting completed or failed jobs
    if job.status in ["pending", "processing"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete job that is still running"
        )
    
    await db.delete(job)
    await db.commit()
    
    return None
