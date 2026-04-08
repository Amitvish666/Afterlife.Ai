"""
Artifact upload and management endpoints
"""

import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.db.models import User, Persona, Artifact
from app.core.security import get_current_user
from app.api.schemas import ArtifactResponse, UploadUrlResponse
from app.services.audit_service import log_action
from app.services.storage_service import StorageService

router = APIRouter()


@router.post("/{persona_id}/upload-url")
async def get_upload_url(
    persona_id: str,
    filename: str,
    content_type: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get presigned URL for direct upload to S3"""
    # Verify persona ownership
    persona = await Persona.get(db, persona_id)
    if not persona or persona.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Persona not found",
        )
    
    storage = StorageService()
    artifact_id = str(uuid.uuid4())
    s3_key = f"{persona_id}/{artifact_id}/{filename}"
    
    upload_url, fields = storage.get_presigned_upload_url(s3_key, content_type)
    
    return UploadUrlResponse(
        upload_url=upload_url,
        fields=fields,
        artifact_id=artifact_id,
    )


@router.post("/{persona_id}/artifacts", response_model=ArtifactResponse)
async def upload_artifact(
    persona_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload an artifact directly"""
    # Verify persona ownership
    persona = await Persona.get(db, persona_id)
    if not persona or persona.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Persona not found",
        )
    
    # Determine file type
    file_type = _get_file_type(file.content_type or "")
    
    # Upload to storage
    storage = StorageService()
    artifact_id = str(uuid.uuid4())
    s3_key = f"{persona_id}/{artifact_id}/{file.filename}"
    file_size = await storage.upload_file(file, s3_key)
    
    # Create artifact record
    artifact = Artifact(
        id=artifact_id,
        persona_id=persona_id,
        file_type=file_type,
        original_filename=file.filename,
        s3_key=s3_key,
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
        status="pending",
    )
    
    db.add(artifact)
    await db.commit()
    await db.refresh(artifact)
    
    await log_action(
        db,
        user_id=current_user.id,
        action="upload_artifact",
        resource_type="artifact",
        resource_id=artifact.id,
        details={"filename": file.filename, "file_type": file_type},
    )
    
    return artifact


@router.get("/{persona_id}/artifacts", response_model=list[ArtifactResponse])
async def list_artifacts(
    persona_id: str,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List artifacts for a persona"""
    # Verify access
    persona = await Persona.get(db, persona_id)
    if not persona or persona.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Persona not found",
        )
    
    query = select(Artifact).where(
        Artifact.persona_id == persona_id,
        Artifact.status != "deleted",
    ).order_by(Artifact.created_at.desc()).offset((page - 1) * limit).limit(limit)
    
    result = await db.execute(query)
    artifacts = list(result.scalars().all())
    
    return artifacts


@router.delete("/{persona_id}/artifacts/{artifact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_artifact(
    persona_id: str,
    artifact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an artifact"""
    artifact = await Artifact.get(db, artifact_id)
    
    if not artifact or artifact.persona_id != persona_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artifact not found",
        )
    
    # Verify persona ownership
    persona = await Persona.get(db, persona_id)
    if not persona or persona.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized",
        )
    
    # Soft delete
    artifact.status = "deleted"
    await db.commit()
    
    await log_action(
        db,
        user_id=current_user.id,
        action="delete_artifact",
        resource_type="artifact",
        resource_id=artifact_id,
    )
    
    return None


def _get_file_type(mime_type: str) -> str:
    """Determine file type from MIME type"""
    if mime_type.startswith("audio/"):
        return "audio"
    elif mime_type.startswith("video/"):
        return "video"
    elif mime_type.startswith("image/"):
        return "image"
    else:
        return "text"
