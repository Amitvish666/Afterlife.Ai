"""
Chat endpoints
"""

import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.db.models import User, Persona, ChatSession, ChatMessage
from app.core.security import get_current_user
from app.api.schemas import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatMessageResponse,
    ChatRequest,
    ChatResponse,
)
from app.services.chat_engine import create_chat_engine
from app.services.websocket_manager import ws_manager

router = APIRouter()


@router.get("/{persona_id}/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List chat sessions for a persona"""
    persona = await Persona.get(db, persona_id)
    if not persona or persona.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    query = select(ChatSession).where(
        ChatSession.persona_id == persona_id
    ).order_by(ChatSession.updated_at.desc())
    
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/{persona_id}/sessions", response_model=ChatSessionResponse)
async def create_session(
    persona_id: str,
    data: ChatSessionCreate | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat session"""
    persona = await Persona.get(db, persona_id)
    if not persona or persona.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    session = ChatSession(
        id=str(uuid.uuid4()),
        persona_id=persona_id,
        title=data.title if data else "New Conversation",
    )
    
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return session


@router.get("/{persona_id}/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_session(
    persona_id: str,
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific chat session"""
    session = await ChatSession.get(db, session_id)
    if not session or session.persona_id != persona_id:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session


@router.post("/{persona_id}/sessions/{session_id}/messages", response_model=ChatResponse)
async def send_message(
    persona_id: str,
    session_id: str,
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the persona"""
    persona = await Persona.get(db, persona_id)
    if not persona or persona.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    if persona.status != "ready":
        raise HTTPException(status_code=400, detail="Persona is not ready for chat")
    
    # Get or create session
    session = await ChatSession.get(db, session_id)
    if not session:
        session = ChatSession(
            id=session_id,
            persona_id=persona_id,
            title="New Conversation",
        )
        db.add(session)
        await db.commit()
    
    # Create chat engine and process message
    chat_engine = await create_chat_engine(persona, db)
    result = await chat_engine.chat(
        message=data.message,
        enable_voice=data.enable_voice,
        enable_avatar=data.enable_avatar,
        temperature=data.temperature,
        language=data.language,
    )
    
    # Save user message
    user_message = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="user",
        content=data.message,
    )
    db.add(user_message)
    
    # Save AI response
    ai_message = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="assistant",
        content=result["content"],
        audio_url=result.get("audio_url"),
        avatar_video_url=result.get("avatar_video_url"),
        tokens_used=result.get("tokens_used", 0),
    )
    db.add(ai_message)
    
    # Update session
    session.message_count += 1
    session.updated_at = datetime.utcnow()
    persona.last_interaction = datetime.utcnow()
    
    await db.commit()
    
    # Broadcast via WebSocket
    await ws_manager.broadcast_chat_message(
        session_id=session_id,
        user_id=current_user.id,
        message={
            "id": ai_message.id,
            "content": result["content"],
            "audio_url": result.get("audio_url"),
            "avatar_video_url": result.get("avatar_video_url"),
        },
    )
    
    return ChatResponse(
        message_id=ai_message.id,
        session_id=session_id,
        content=result["content"],
        audio_url=result.get("audio_url"),
        avatar_video_url=result.get("avatar_video_url"),
        tokens_used=result.get("tokens_used", 0),
        retrieved_memories=result.get("retrieved_memories", []),
    )


@router.get("/{persona_id}/sessions/{session_id}/messages", response_model=list[ChatMessageResponse])
async def get_messages(
    persona_id: str,
    session_id: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get messages for a session"""
    session = await ChatSession.get(db, session_id)
    if not session or session.persona_id != persona_id:
        raise HTTPException(status_code=404, detail="Session not found")
    
    query = select(ChatMessage).where(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).limit(limit)
    
    result = await db.execute(query)
    return list(result.scalars().all())


@router.delete("/{persona_id}/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    persona_id: str,
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a chat session"""
    session = await ChatSession.get(db, session_id)
    if not session or session.persona_id != persona_id:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db.delete(session)
    await db.commit()
    
    return None


@router.websocket("/{persona_id}/ws")
async def websocket_chat(
    websocket: WebSocket,
    persona_id: str,
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """WebSocket endpoint for real-time chat"""
    # Validate token and get user
    try:
        from app.core.security import decode_token
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001)
            return
    except Exception:
        await websocket.close(code=4001)
        return
    
    # Verify persona access
    persona = await Persona.get(db, persona_id)
    if not persona or persona.user_id != user_id:
        await websocket.close(code=4003)
        return
    
    # Connect
    await ws_manager.connect(websocket, user_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "message":
                message = data.get("payload", {}).get("message")
                if message:
                    chat_engine = await create_chat_engine(persona, db)
                    result = await chat_engine.chat(message=message)
                    
                    await websocket.send_json({
                        "type": "message",
                        "payload": {
                            "content": result["content"],
                            "audio_url": result.get("audio_url"),
                            "avatar_video_url": result.get("avatar_video_url"),
                        }
                    })
                    
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(websocket, user_id)
