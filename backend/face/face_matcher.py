import os
import logging
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from dotenv import load_dotenv

from services.supabase_service import supabase_service

load_dotenv()

logger = logging.getLogger("ibvap.face_matcher")


def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    """Computes cosine similarity between two normalized embedding vectors."""
    dot = np.dot(v1, v2)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(dot / (norm1 * norm2))


class FaceMatcher:
    """
    Biometric Face Matcher.
    Compares query face embeddings against authorized Friendly Persons in Supabase.
    """

    def __init__(self):
        self.match_threshold = float(os.getenv("FACE_MATCH_THRESHOLD", "0.45"))
        # In-memory embedding registry: { person_id: {"name": str, "embedding": np.ndarray, "department": str, "badge": str} }
        self.registered_embeddings: Dict[str, Dict[str, Any]] = {}
        self._init_demo_embeddings()

    def _init_demo_embeddings(self):
        """Initializes baseline embedding anchors for pre-seeded Friendly Persons."""
        demo_friendly = [
            {"id": "FP-101", "name": "Inspector Arun Kumar", "department": "Border Security Force"},
            {"id": "FP-102", "name": "Major Rajesh Sharma", "department": "Indian Army — Border Division"},
            {"id": "FP-103", "name": "Inspector Priya Verma", "department": "142nd BSF Battalion"},
            {"id": "FP-104", "name": "Head Constable Vikram Singh", "department": "Quick Reaction Team"},
            {"id": "FP-105", "name": "Subedar Gurpreet Singh", "department": "Indian Army — Border Division"},
            {"id": "FP-106", "name": "Officer Sneha Patil", "department": "Indo-Tibetan Border Police"},
        ]

        for i, person in enumerate(demo_friendly):
            # Seed deterministic normalized 512-dim vector anchor
            np.random.seed(1000 + i)
            vec = np.random.randn(512).astype(np.float32)
            vec = vec / np.linalg.norm(vec)
            self.registered_embeddings[person["id"]] = {
                "name": person["name"],
                "person_id": person["id"],
                "department": person["department"],
                "embedding": vec
            }

    def register_person_embedding(self, person_id: str, name: str, embedding_vector: List[float], department: str = "Border Defense"):
        """Registers or updates a friendly person's face embedding."""
        vec = np.array(embedding_vector, dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm

        self.registered_embeddings[person_id] = {
            "name": name,
            "person_id": person_id,
            "department": department,
            "embedding": vec
        }
        logger.info(f"Registered face embedding for '{name}' (ID: {person_id})")

    def match_face(self, query_embedding: List[float]) -> Dict[str, Any]:
        """
        Matches query face embedding against registered Friendly Persons.

        Returns:
        {
            "matched": True/False,
            "identity": "Major Rajesh Sharma" or None,
            "person_id": "FP-102" or None,
            "friendly": True/False,
            "match_confidence": 0.91
        }
        """
        if not self.registered_embeddings:
            return {
                "matched": False,
                "identity": None,
                "person_id": None,
                "friendly": False,
                "match_confidence": 0.0
            }

        query_vec = np.array(query_embedding, dtype=np.float32)
        norm = np.linalg.norm(query_vec)
        if norm > 0:
            query_vec = query_vec / norm

        best_score = -1.0
        best_person = None

        for person_id, p_data in self.registered_embeddings.items():
            sim = cosine_similarity(query_vec, p_data["embedding"])
            if sim > best_score:
                best_score = sim
                best_person = p_data

        # Convert cosine distance / similarity
        # If best_score passes similarity threshold (e.g. >= 0.55 / distance <= 0.45)
        # We scale similarity score gracefully to 0.0 - 0.99
        if best_person and best_score >= (1.0 - self.match_threshold):
            confidence = round(float(min(0.99, max(0.50, best_score))), 2)
            return {
                "matched": True,
                "identity": best_person["name"],
                "person_id": best_person["person_id"],
                "friendly": True,
                "match_confidence": confidence
            }

        # Unknown Person (NOT automatically classified as a threat)
        return {
            "matched": False,
            "identity": None,
            "person_id": None,
            "friendly": False,
            "match_confidence": 0.0
        }


# Global Singleton
face_matcher = FaceMatcher()
