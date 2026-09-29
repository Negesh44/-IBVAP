import random
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from models.schemas import DetectionItem, EventSchema, AlertSchema
from services.supabase_service import supabase_service


class EventService:
    """
    Event and Alert Processing Service.
    Aggregates detections and dispatches incident records to Supabase.
    """

    def process_detection(self, detection: DetectionItem) -> Optional[Dict[str, Any]]:
        """
        Evaluates a detection item and conditionally triggers an event or alert.
        """
        # If unknown person with high confidence in restricted zone -> flag warning / alert
        if detection.object_type == "person" and not detection.friendly and detection.confidence > 0.90:
            now_str = datetime.now(timezone.utc).isoformat()
            
            # 1. Create Event
            event_data = {
                "id": f"EVT-{random.randint(9000, 9999)}",
                "event_type": "Unknown Person Detected",
                "object_type": "PERSON",
                "confidence": detection.confidence,
                "camera_id": detection.camera_id,
                "camera_name": f"Camera {detection.camera_id}",
                "location": "Perimeter Restricted Boundary",
                "severity": "WARNING",
                "evidence_url": "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80",
                "timestamp": now_str
            }
            supabase_service.create_event(event_data)
            return event_data

        return None


event_service = EventService()
