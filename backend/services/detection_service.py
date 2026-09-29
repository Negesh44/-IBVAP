import random
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from models.schemas import DetectionItem


class DetectionService:
    """
    Detection & Tracking Service.
    Designed to serve simulated live detections over WebSocket,
    and prepared for drop-in replacement by YOLOv8 + ByteTrack inference.
    """

    def __init__(self):
        self.active_tracks: Dict[str, Dict[str, Any]] = {}
        self.camera_pool = ["BOP-001", "BOP-002", "BOP-003", "CHECKPOST-001"]
        self.friendly_names = [
            "Subedar Gurpreet Singh (IA-5521)",
            "Inspector Priya Verma (BSF-2041)",
            "Head Constable Vikram Singh (BSF-4012)",
            "Officer Sneha Patil (ITBP-3199)",
            "Major Rajesh Sharma (IA-9081)"
        ]

    def generate_simulated_detection(self, camera_id: Optional[str] = None) -> DetectionItem:
        """
        Generates realistic tracking bounding boxes with coordinate smoothing.
        Matches the exact schema required for IBVAP live surveillance feeds.
        """
        cam_id = camera_id or random.choice(self.camera_pool)
        obj_type = random.choices(["person", "vehicle"], weights=[0.8, 0.2])[0]

        is_friendly = False
        identity = None

        if obj_type == "person":
            track_prefix = "P"
            is_friendly = random.random() < 0.35
            if is_friendly:
                identity = random.choice(self.friendly_names)
        else:
            track_prefix = "V"
            identity = f"MIL-DL-{random.randint(10, 99)}-{random.randint(1000, 9999)}"

        track_num = random.randint(101, 140)
        track_id = f"{track_prefix}-{track_num}"

        # Maintain or generate smooth bounding box movement
        if track_id in self.active_tracks:
            box = self.active_tracks[track_id]
            dx = random.randint(-8, 8)
            dy = random.randint(-5, 5)
            x1 = max(20, min(500, box["bbox"][0] + dx))
            y1 = max(40, min(350, box["bbox"][1] + dy))
            w = box["bbox"][2] - box["bbox"][0]
            h = box["bbox"][3] - box["bbox"][1]
            x2 = x1 + w
            y2 = y1 + h
        else:
            x1 = random.randint(80, 360)
            y1 = random.randint(100, 240)
            w = random.randint(100, 160) if obj_type == "person" else random.randint(200, 300)
            h = random.randint(220, 320) if obj_type == "person" else random.randint(140, 200)
            x2 = x1 + w
            y2 = y1 + h

        bbox = [int(x1), int(y1), int(x2), int(y2)]
        confidence = round(random.uniform(0.85, 0.98), 2)
        now_utc = datetime.now(timezone.utc).isoformat()

        item = DetectionItem(
            camera_id=cam_id,
            track_id=track_id,
            object_type=obj_type,
            confidence=confidence,
            bbox=bbox,
            identity=identity,
            friendly=is_friendly,
            timestamp=now_utc
        )

        # Cache track state
        self.active_tracks[track_id] = {
            "bbox": bbox,
            "last_seen": time.time()
        }

        # Cleanup tracks older than 10 seconds
        now = time.time()
        self.active_tracks = {k: v for k, v in self.active_tracks.items() if now - v["last_seen"] < 10}

        return item

    def run_inference_on_frame(self, frame_bytes: bytes, camera_id: str) -> List[DetectionItem]:
        """
        Placeholder method for real YOLOv8 + ByteTrack model invocation.
        When connected, decode frame_bytes with OpenCV/NumPy, run model.track(),
        and convert detections into DetectionItem objects.
        """
        # In simulator mode, emit simulated bounding boxes
        return [self.generate_simulated_detection(camera_id)]


# Global singleton instance
detection_service = DetectionService()
