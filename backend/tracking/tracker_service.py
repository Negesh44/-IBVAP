import time
import io
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from PIL import Image

from ai.detector import detect_frame
from tracking.bytetrack_tracker import ByteTrackTracker

logger = logging.getLogger("ibvap.tracker_service")


class TrackerService:
    """
    Multi-Camera Multi-Object Tracking Service.
    Maintains independent ByteTrack tracker instances per camera_id.
    """

    def __init__(self):
        # Dictionary mapping camera_id -> ByteTrackTracker
        self.camera_trackers: Dict[str, ByteTrackTracker] = {}

    def get_tracker(self, camera_id: str) -> ByteTrackTracker:
        """
        Retrieves or initializes a dedicated ByteTrack tracker for a specific camera stream.
        Guarantees that objects from different cameras never share or interfere with track IDs.
        """
        if camera_id not in self.camera_trackers:
            logger.info(f"Initializing new ByteTrack tracker instance for camera '{camera_id}'")
            self.camera_trackers[camera_id] = ByteTrackTracker()
        return self.camera_trackers[camera_id]

    def update_camera_feed(self, camera_id: str, detections: List[Dict[str, Any]]) -> List[Any]:
        """
        Updates the camera's tracker instance with new detections.
        """
        tracker = self.get_tracker(camera_id)
        return tracker.update(detections)

    def reset_camera_tracker(self, camera_id: str) -> bool:
        """
        Resets tracking state and Kalman filters for a specific camera.
        """
        if camera_id in self.camera_trackers:
            self.camera_trackers[camera_id].reset()
            logger.info(f"Tracker state reset for camera '{camera_id}'")
            return True
        return False

    def process_and_track_frame(
        self,
        image_bytes: bytes,
        camera_id: str = "default_camera",
        conf_threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        End-to-End Pipeline: Image Frame → YOLO Object Detection → ByteTrack Association.

        Returns:
        {
            "detections": [
                {"class_id": 0, "object_type": "person", "confidence": 0.96, "bbox": [x1, y1, x2, y2]}
            ],
            "tracking": [
                {"track_id": 104, "class_id": 0, "object_type": "person", "confidence": 0.96, "bbox": [x1, y1, x2, y2]}
            ],
            "inference_time_ms": 16.4,
            "tracking_time_ms": 1.2,
            "timestamp": "2026-09-29T12:00:00Z"
        }
        """
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            raise ValueError(f"Failed to decode uploaded image: {e}")

        # -------------------------------------------------------------
        # Step 1: YOLO Object Detection
        # -------------------------------------------------------------
        start_inf = time.perf_counter()
        raw_detections = detect_frame(pil_img, conf_threshold=conf_threshold)
        inference_time_ms = round((time.perf_counter() - start_inf) * 1000, 2)

        # -------------------------------------------------------------
        # Step 2: ByteTrack Multi-Object Association
        # -------------------------------------------------------------
        start_track = time.perf_counter()
        tracker = self.get_tracker(camera_id)
        tracked_objects = tracker.update(raw_detections)
        tracking_time_ms = round((time.perf_counter() - start_track) * 1000, 2)

        # -------------------------------------------------------------
        # [FUTURE PIPELINE INTEGRATION HOOK]
        # Downstream event analysis modules will consume `tracked_objects`:
        # 1. Virtual Fence / Spatial Tripwire: Evaluates if track's bbox crosses boundary polygon.
        # 2. Loitering Detector: Evaluates dwell duration for stable track_id within ROI.
        # 3. Biometric Face Recognition: Cropped head region matching against friendly_persons.
        # 4. ANPR (Automatic Number Plate Recognition): OCR reading on vehicle bounding boxes.
        # -------------------------------------------------------------

        now_str = datetime.now(timezone.utc).isoformat()

        return {
            "detections": raw_detections,
            "tracking": tracked_objects,
            "inference_time_ms": inference_time_ms,
            "tracking_time_ms": tracking_time_ms,
            "timestamp": now_str
        }


# Global Tracker Service Instance
tracker_service = TrackerService()
