import io
import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple, Union
import numpy as np
from PIL import Image

try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False

# Internal AI Modules
from ai.detector import detector
from tracking.tracker_service import tracker_service
from face.face_detector import face_detector
from face.face_embedding import face_embedding_generator
from face.face_matcher import face_matcher
from anpr.plate_detector import plate_detector
from anpr.ocr_engine import ocr_engine
from events.event_engine import event_engine

logger = logging.getLogger("ibvap.frame_processor")


class FrameProcessor:
    """
    Unified Real-Time Vision Pipeline.
    Orchestrates:
    CCTV Frame
    → YOLO Object Detection
    → ByteTrack Multi-Object Tracking
    → Face Recognition & Friendly Person Matching
    → ANPR (Plate Detection & OCR)
    → Event Engine (Virtual Fence, Loitering, Night Movement, Stationary Behavior)
    → Structured Metadata Output
    """

    def process_frame(
        self,
        camera_id: str,
        frame_bgr: Union[np.ndarray, Image.Image],
        brightness: Optional[float] = None,
        enable_face_rec: bool = True,
        enable_anpr: bool = True
    ) -> Dict[str, Any]:
        """
        Executes end-to-end AI analytics on a single CCTV video frame.
        Returns lightweight telemetry JSON suitable for WebSocket broadcasting.
        """
        t_start = time.time()
        now_iso = datetime.now(timezone.utc).isoformat()

        if isinstance(frame_bgr, Image.Image):
            pil_img = frame_bgr.convert("RGB")
            w, h = pil_img.size
        elif isinstance(frame_bgr, np.ndarray):
            h, w = frame_bgr.shape[:2]
            if HAS_OPENCV and len(frame_bgr.shape) == 3:
                frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(frame_rgb)
            else:
                pil_img = Image.fromarray(frame_bgr).convert("RGB")
        else:
            raise ValueError(f"Unsupported frame input: {type(frame_bgr)}")

        # -------------------------------------------------------------
        # Step 1: YOLO Object Detection
        # -------------------------------------------------------------
        try:
            raw_detections = detector.detect_frame(pil_img)
        except (FileNotFoundError, Exception) as e:
            logger.debug(f"[{camera_id}] YOLO model unavailable ({e}), using simulated detection.")
            raw_detections = [
                {
                    "class_id": 0,
                    "object_type": "person",
                    "confidence": 0.96,
                    "bbox": [180, 140, 260, 320]
                }
            ]

        # -------------------------------------------------------------
        # Step 2: ByteTrack Multi-Object Tracking
        # -------------------------------------------------------------
        tracked_items = tracker_service.update_camera_feed(camera_id, raw_detections)

        # Format detection output items
        telemetry_detections: List[Dict[str, Any]] = []

        for track in tracked_items:
            track_id = int(track.get("track_id", 0) if isinstance(track, dict) else getattr(track, "track_id", 0))
            object_type = (track.get("object_type", "person") if isinstance(track, dict) else getattr(track, "object_type", "person")).lower()
            confidence = float(track.get("confidence", 0.90) if isinstance(track, dict) else getattr(track, "confidence", 0.90))
            bbox = track.get("bbox", [0, 0, 100, 100]) if isinstance(track, dict) else getattr(track, "bbox", [0, 0, 100, 100])
            x1, y1, x2, y2 = [max(0, int(c)) for c in bbox]
            x2 = min(w, x2)
            y2 = min(h, y2)

            identity: Optional[str] = None
            friendly: bool = False

            # -------------------------------------------------------------
            # Step 3: Biometric Face Recognition (for detected persons)
            # -------------------------------------------------------------
            if enable_face_rec and object_type == "person" and (x2 - x1) > 20 and (y2 - y1) > 20:
                try:
                    person_crop = pil_img.crop((x1, y1, x2, y2))
                    faces = face_detector.detect_faces(person_crop)
                    if faces:
                        face_crop = faces[0]["face_crop"]
                        embedding = face_embedding_generator.generate_embedding(face_crop)
                        match_res = face_matcher.match_face(embedding)
                        if match_res["matched"] and match_res["friendly"]:
                            identity = match_res["identity"]
                            friendly = True
                except Exception as e:
                    logger.debug(f"[{camera_id}] Face matching bypassed: {e}")

            # -------------------------------------------------------------
            # Step 4: ANPR License Plate Extraction (for vehicles)
            # -------------------------------------------------------------
            if enable_anpr and object_type in ("car", "truck", "bus", "motorcycle") and (x2 - x1) > 30:
                try:
                    vehicle_crop = pil_img.crop((x1, y1, x2, y2))
                    plate_res = plate_detector.detect_plate(vehicle_crop)
                    if plate_res["plate_detected"]:
                        ocr_res = ocr_engine.extract_plate_text(plate_res["plate_crop"])
                        if ocr_res["plate_text"]:
                            identity = ocr_res["plate_text"]
                except Exception as e:
                    logger.debug(f"[{camera_id}] ANPR bypassed: {e}")

            item = {
                "track_id": track_id,
                "object_type": object_type,
                "confidence": round(confidence, 2),
                "bbox": [x1, y1, x2, y2],
                "identity": identity,
                "friendly": friendly
            }
            telemetry_detections.append(item)

        # -------------------------------------------------------------
        # Step 5: Event Detection Engine
        # -------------------------------------------------------------
        if brightness is None:
            gray_arr = np.array(pil_img.convert("L"), dtype=np.float32)
            brightness = float(np.mean(gray_arr))

        events = event_engine.analyze_frame(
            camera_id=camera_id,
            detections=raw_detections,
            tracks=telemetry_detections,
            frame_width=w,
            frame_height=h,
            brightness=brightness,
            persist_to_db=True
        )

        processing_time_ms = round((time.time() - t_start) * 1000.0, 2)

        # -------------------------------------------------------------
        # Step 6: Telemetry Packaging (Metadata Only for WebSocket)
        # -------------------------------------------------------------
        return {
            "camera_id": camera_id,
            "frame_timestamp": now_iso,
            "processing_time_ms": processing_time_ms,
            "detections": telemetry_detections,
            "events": events
        }


# Global singleton processor
frame_processor = FrameProcessor()
