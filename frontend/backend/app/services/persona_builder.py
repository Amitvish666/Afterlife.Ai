"""
Persona profile builder service - AI-assisted persona creation
"""

import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.db.models import Persona, MemoryItem
from app.services.openai_service import OpenAIService

logger = logging.getLogger(__name__)


class PersonaProfileBuilder:
    """
    AI-assisted persona profile builder.
    
    Helps create comprehensive persona profiles by:
    - Analyzing uploaded memories
    - Extracting personality traits
    - Identifying speech patterns
    - Building biography from facts
    """
    
    def __init__(self):
        self.openai_service = OpenAIService()
    
    async def build_profile_from_memories(
        self,
        db: AsyncSession,
        persona_id: str,
    ) -> Dict[str, Any]:
        """
        Build a comprehensive persona profile from extracted memories.
        
        Args:
            db: Database session
            persona_id: ID of the persona
            
        Returns:
            Dictionary with profile data
        """
        from app.db.models import Persona, MemoryItem
        from sqlalchemy import select
        
        # Get persona
        persona = await Persona.get(db, persona_id)
        if not persona:
            raise ValueError(f"Persona {persona_id} not found")
        
        # Get all memories
        result = await db.execute(
            select(MemoryItem)
            .where(MemoryItem.persona_id == persona_id)
            .where(MemoryItem.is_active == True)
        )
        memories = list(result.scalars().all())
        
        if not memories:
            return {"status": "no_memories", "message": "No memories to build profile from"}
        
        # Get memory text
        memory_texts = [m.text for m in memories]
        combined_text = "\n\n".join(memory_texts[:50])  # Limit to first 50
        
        # Build profile using AI
        profile = await self._generate_profile(
            name=persona.title,
            relation=persona.relation or "relative",
            memories=combined_text,
        )
        
        # Update persona with profile
        persona.summary = profile
        await db.commit()
        
        return {
            "status": "success",
            "profile": profile,
            "memories_analyzed": len(memories),
        }
    
    async def _generate_profile(
        self,
        name: str,
        relation: str,
        memories: str,
    ) -> Dict[str, Any]:
        """Generate persona profile using AI"""
        
        prompt = f"""Analyze the following memories about {name} (a {relation}) and create a comprehensive profile.

Memories:
{memories[:3000]}

Create a JSON profile with the following structure:
{{
    "name": "{name}",
    "date_of_birth": "YYYY-MM-DD or null if not mentioned",
    "relationships": ["list of key relationships"],
    "key_facts": ["important facts about their life"],
    "personality_traits": ["5-10 traits that describe their personality"],
    "speech_patterns": ["5-10 phrases or speech characteristics"],
    "interests": ["hobbies, interests, passions"],
    "values": ["core values and beliefs"],
    "communication_style": "brief description of how they communicate",
    "sample_responses": ["2-3 examples of how they would respond to common questions"]
}}

Analyze the memories and extract accurate information. If information is not available, use null or empty lists. Be accurate to who this person was based on the memories provided."""
        
        try:
            response = await self.openai_service.structured_output(
                messages=[
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            
            return response
            
        except Exception as e:
            logger.exception(f"Error generating profile: {e}")
            return {
                "name": name,
                "relationships": [],
                "key_facts": [],
                "personality_traits": [],
                "speech_patterns": [],
                "interests": [],
                "values": [],
                "communication_style": "warm and friendly",
                "sample_responses": [],
            }
    
    async def suggest_memories(
        self,
        db: AsyncSession,
        persona_id: str,
    ) -> List[str]:
        """
        Suggest types of memories that would be valuable to add.
        
        Args:
            db: Database session
            persona_id: ID of the persona
            
        Returns:
            List of suggested memory types
        """
        from app.db.models import Persona, MemoryItem
        from sqlalchemy import select
        
        # Get persona and existing memory categories
        persona = await Persona.get(db, persona_id)
        if not persona:
            return []
        
        result = await db.execute(
            select(MemoryItem.category)
            .where(MemoryItem.persona_id == persona_id)
            .where(MemoryItem.is_active == True)
        )
        existing_categories = set(result.scalars().all())
        
        # All possible categories
        all_categories = {
            "personal_fact": "Birth date, education, career, places lived",
            "relationship": "Family members, friends, significant others",
            "preference": "Likes, dislikes, hobbies, favorite things",
            "memory": "Important life events and experiences",
            "quote": "Famous sayings or things they often said",
            "behavior": "Personality traits and habitual behaviors",
            "opinion": "Views on politics, religion, life topics",
            "skill": "Talents, abilities, expertise",
        }
        
        # Suggest missing categories
        suggestions = []
        for category, description in all_categories.items():
            if category not in existing_categories:
                suggestions.append({
                    "category": category,
                    "description": description,
                    "priority": "high" if category in ["personal_fact", "relationship", "memory"] else "medium",
                })
        
        return suggestions
    
    async def analyze_memory_coherence(
        self,
        db: AsyncSession,
        persona_id: str,
    ) -> Dict[str, Any]:
        """
        Analyze if memories are coherent and consistent.
        
        Args:
            db: Database session
            persona_id: ID of the persona
            
        Returns:
            Analysis results
        """
        from app.db.models import Persona, MemoryItem
        from sqlalchemy import select
        
        # Get persona
        persona = await Persona.get(db, persona_id)
        if not persona:
            return {"error": "Persona not found"}
        
        # Get all memories
        result = await db.execute(
            select(MemoryItem)
            .where(MemoryItem.persona_id == persona_id)
            .where(MemoryItem.is_active == True)
        )
        memories = list(result.scalars().all())
        
        if len(memories) < 5:
            return {
                "status": "insufficient_data",
                "message": "Need at least 5 memories to analyze coherence",
                "memory_count": len(memories),
            }
        
        # Get summary
        summary = persona.summary or {}
        
        # Simple analysis
        analysis = {
            "status": "analyzed",
            "memory_count": len(memories),
            "average_importance": sum(m.importance for m in memories) / len(memories) if memories else 0,
            "categories_found": list(set(m.category for m in memories if m.category)),
            "profile_completeness": self._calculate_profile_completeness(summary),
            "coherence_score": self._calculate_coherence(memories),
        }
        
        return analysis
    
    def _calculate_profile_completeness(self, summary: Dict) -> float:
        """Calculate how complete the persona profile is"""
        required_fields = [
            "personality_traits",
            "speech_patterns",
            "relationships",
            "key_facts",
            "interests",
        ]
        
        if not summary:
            return 0.0
        
        completed = sum(1 for f in required_fields if summary.get(f))
        return completed / len(required_fields)
    
    def _calculate_coherence(self, memories: List[MemoryItem]) -> float:
        """Calculate coherence score based on memory categories"""
        if not memories:
            return 0.0
        
        # More diverse categories = potentially less coherent
        categories = set(m.category for m in memories if m.category)
        
        if len(categories) == 1:
            return 0.8  # Focused memories
        elif len(categories) <= 3:
            return 0.7  # Good diversity
        elif len(categories) <= 5:
            return 0.6  # Somewhat diverse
        else:
            return 0.5  # Very diverse


# Singleton instance
persona_profile_builder = PersonaProfileBuilder()
