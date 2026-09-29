import io
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from PIL import Image

from face.face_detector import face_detector
from face.face_embedding import face_embedding_generator
from face.face_matcher import face_matcher
from services.supabase_service import supabase_service

logger = logging.getLogger("ibvap.face_service")


class FaceRecognitionService:
    """
    Biometric Face Recognition & Friendly Person Identification Service.
    Integrates Detection → InceptionResnetV1 Embedding → Vector Matching → Audit Logging.
    """

    def recognize_frame(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Processes an incoming image frame and recognizes human identities against Friendly Persons whitelist.
        """
        now_str = datetime.now(timezone.utc).isoformat()

        try:
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            raise ValueError(f"Failed to decode image bytes: {e}")

        # Step 1: Detect Faces
        faces = face_detector.detect_faces(pil_img)

        # Edge case: No face detected
        if not faces:
            return {
                "face_detected": False,
                "identity": None,
                "person_id": None,
                "friendly": False,
                "match_confidence": 0.0,
                "bbox": None,
                "timestamp": now_str
            }

        # Evaluate primary face
        primary_face = faces[0]
        face_bbox = primary_face["bbox"]
        face_crop = primary_face["face_crop"]

        # Step 2: Generate Embedding Vector
        embedding = face_embedding_generator.generate_embedding(face_crop)

        # Step 3: Match with Authorized Friendly Persons
        match_result = face_matcher.match_face(embedding)

        # Step 4: Audit Logging if verified Friendly Person is identified
        if match_result["matched"] and match_result["friendly"]:
            logger.info(f"Authorized Friendly Person Verified: {match_result['identity']} (ID: {match_result['person_id']}, Conf: {match_result['match_confidence']})")

        return {
            "face_detected": True,
            "identity": match_result["identity"],
            "person_id": match_result["person_id"],
            "friendly": match_result["friendly"],
            "match_confidence": match_result["match_confidence"],
            "bbox": face_bbox,
            "timestamp": now_str
        }

    def register_person_face(
        self,
        person_id: str,
        image_bytes: bytes,
        person_name: str = "Authorized Personnel",
        department: str = "Border Defense Unit"
    ) -> Dict[str, Any]:
        """
        Generates and securely stores face embedding for an enrolled Friendly Person.
        """
        try:
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            raise ValueError(f"Invalid registration photo: {e}")

        faces = face_detector.detect_faces(pil_img)
        if not faces:
            raise ValueError("No face could be detected in the provided enrollment photo.")

        face_crop = faces[0]["face_crop"]
        embedding = face_embedding_generator.generate_embedding(face_crop)

        # Register in matcher memory
        face_matcher.register_person_embedding(
            person_id=person_id,
            name=person_name,
            embedding_vector=embedding,
            department=department
        )

        return {
            "person_id": person_id,
            "name": person_name,
            "face_registered": True,
            "embedding_dimensions": len(embedding),
            "status": "SUCCESS",
            "message": f"Biometric face template registered for '{person_name}'."
        }


# Global Singleton
face_service = FaceRecognitionService()
