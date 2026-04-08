"""
WebSocket connection manager for real-time updates
"""

import json
from typing import Dict, Set
from fastapi import WebSocket
from dataclasses import dataclass, field

import logging

logger = logging.getLogger(__name__)


@dataclass
class ConnectionManager:
    """Manages WebSocket connections"""
    connections: Dict[str, Set[WebSocket]] = field(default_factory=dict)
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept and register a new connection"""
        await websocket.accept()
        if user_id not in self.connections:
            self.connections[user_id] = set()
        self.connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected via WebSocket")
    
    async def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a connection"""
        if user_id in self.connections:
            self.connections[user_id].discard(websocket)
            if not self.connections[user_id]:
                del self.connections[user_id]
        logger.info(f"User {user_id} disconnected from WebSocket")
    
    async def send_personal_message(
        self,
        message: dict,
        user_id: str,
    ):
        """Send a message to a specific user"""
        if user_id in self.connections:
            for connection in self.connections[user_id].copy():
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending WebSocket message: {e}")
    
    async def broadcast(
        self,
        message: dict,
        user_ids: list[str] = None,
    ):
        """Broadcast a message to multiple users or all"""
        if user_ids:
            for user_id in user_ids:
                await self.send_personal_message(message, user_id)
        else:
            for user_id in list(self.connections.keys()):
                await self.send_personal_message(message, user_id)
    
    async def broadcast_job_update(
        self,
        job_id: str,
        user_id: str,
        status: str,
        progress: float,
        error: str = None,
    ):
        """Broadcast job update"""
        message = {
            "type": "job_update",
            "payload": {
                "job_id": job_id,
                "status": status,
                "progress": progress,
                "error": error,
            },
        }
        await self.send_personal_message(message, user_id)
    
    async def broadcast_chat_message(
        self,
        session_id: str,
        user_id: str,
        message: dict,
    ):
        """Broadcast new chat message"""
        ws_message = {
            "type": "chat_message",
            "payload": {
                "session_id": session_id,
                "message": message,
            },
        }
        await self.send_personal_message(ws_message, user_id)


# Global connection manager
ws_manager = ConnectionManager()
