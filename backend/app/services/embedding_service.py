"""
Embedding service for vector storage and retrieval
"""

import logging
from typing import List, Optional, Dict, Any
import numpy as np

from app.core.config import settings
from app.services.openai_service import OpenAIService

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for text embeddings and vector storage"""
    
    def __init__(self):
        self.openai_service = OpenAIService()
        self.vector_store = None
    
    async def create_embedding(self, text: str) -> List[float]:
        """Create embedding for a single text"""
        return await self.openai_service.text_embedding(text)
    
    async def create_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Create embeddings for multiple texts"""
        return await self.openai_service.text_embeddings(texts)
    
    async def index_memories(
        self,
        memories: List[Dict[str, Any]],
    ) -> bool:
        """Index memories in vector store"""
        try:
            texts = [m["text"] for m in memories]
            embeddings = await self.create_embeddings(texts)
            
            # Store in Pinecone if configured
            if settings.PINECONE_API_KEY:
                await self._index_pinecone(memories, embeddings)
            else:
                await self._index_faiss(memories, embeddings)
            
            return True
        except Exception as e:
            logger.exception(f"Error indexing memories: {e}")
            return False
    
    async def search_memories(
        self,
        persona_id: str,
        query: str,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Search memories by query"""
        try:
            query_embedding = await self.create_embedding(query)
            
            if settings.PINECONE_API_KEY:
                return await self._search_pinecone(
                    persona_id, query_embedding, limit
                )
            else:
                return await self._search_faiss(
                    persona_id, query_embedding, limit
                )
        except Exception as e:
            logger.exception(f"Error searching memories: {e}")
            return []
    
    async def _index_pinecone(
        self,
        memories: List[Dict[str, Any]],
        embeddings: List[List[float]],
    ):
        """Index in Pinecone vector database"""
        # Import here to avoid dependency issues
        try:
            import pinecone
            from pinecone import Index
            
            pinecone.init(
                api_key=settings.PINECONE_API_KEY,
                environment=settings.PINECONE_ENVIRONMENT,
            )
            
            index = Index(settings.PINECONE_INDEX_NAME)
            
            # Prepare vectors
            vectors = []
            for i, (memory, embedding) in enumerate(zip(memories, embeddings)):
                vectors.append((
                    memory["id"],
                    embedding,
                    {"text": memory["text"], "persona_id": memory["persona_id"]}
                ))
            
            # Upsert vectors
            index.upsert(vectors=vectors)
            
        except Exception as e:
            logger.error(f"Pinecone indexing error: {e}")
            raise
    
    async def _search_pinecone(
        self,
        persona_id: str,
        query_embedding: List[float],
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Search in Pinecone"""
        try:
            import pinecone
            from pinecone import Index
            
            pinecone.init(
                api_key=settings.PINECONE_API_KEY,
                environment=settings.PINECONE_ENVIRONMENT,
            )
            
            index = Index(settings.PINECONE_INDEX_NAME)
            
            # Query with filter
            results = index.query(
                vector=query_embedding,
                filter={"persona_id": {"$eq": persona_id}},
                top_k=limit,
                include_metadata=True,
            )
            
            return [
                {
                    "id": match.id,
                    "score": match.score,
                    "text": match.metadata.get("text", ""),
                }
                for match in results.matches
            ]
            
        except Exception as e:
            logger.error(f"Pinecone search error: {e}")
            return []
    
    async def _index_faiss(
        self,
        memories: List[Dict[str, Any]],
        embeddings: List[List[float]],
    ):
        """Index in FAISS (local)"""
        try:
            import faiss
            
            # Create index
            dimension = len(embeddings[0]) if embeddings else 1536
            index = faiss.IndexFlatL2(dimension)
            
            # Add embeddings
            embeddings_array = np.array(embeddings).astype("float32")
            index.add(embeddings_array)
            
            # Store with memories
            self.vector_store = {
                "index": index,
                "memories": memories,
            }
            
        except Exception as e:
            logger.error(f"FAISS indexing error: {e}")
            raise
    
    async def _search_faiss(
        self,
        persona_id: str,
        query_embedding: List[float],
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Search in FAISS"""
        try:
            if not self.vector_store:
                return []
            
            import faiss
            
            index = self.vector_store["index"]
            memories = self.vector_store["memories"]
            
            # Search
            query_array = np.array([query_embedding]).astype("float32")
            distances, indices = index.search(query_array, limit)
            
            return [
                {
                    "id": memories[i]["id"],
                    "score": float(distances[0][j]),
                    "text": memories[i]["text"],
                }
                for j, i in enumerate(indices[0])
                if i < len(memories)
            ]
            
        except Exception as e:
            logger.error(f"FAISS search error: {e}")
            return []
