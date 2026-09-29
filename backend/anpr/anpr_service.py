import io
import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from PIL import Image

from ai.detector import detect_frame
from anpr.plate_detector import plate_detector
from anpr.ocr_engine import ocr_engine
from services.event_service import event_service

logger = logging.getLogger("ibvap.anpr_service")

VEHICLE_CLASSES = {"car", "truck", "bus", "motorcycle"}


class ANPRService:
    """
    Automatic Number Plate Recognition (ANPR) Service.
    Pipeline:
    Image → YOLO Vehicle Detection → License Plate Detection → Preprocessing → PaddleOCR
    """

    def process_anpr_frame(
        self,
        image_bytes: bytes,
        conf_threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Executes end-to-end ANPR pipeline on input frame.

        Returns:
        {
            "vehicle_type": "car",
            "vehicle_confidence": 0.94,
            "plate_text": "TN09AB1234",
            "plate_confidence": 0.91,
            "plate_bbox": [120, 180, 300, 230],
            "timestamp": "2026-09-29T12:00:00Z"
        }
        """
        now_str = datetime.now(timezone.utc).isoformat()

        try:
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            raise ValueError(f"Failed to decode image payload: {e}")

        # -------------------------------------------------------------
        # Step 1: YOLO Vehicle Detection (car, truck, bus, motorcycle)
        # -------------------------------------------------------------
        all_detections = detect_frame(pil_img, conf_threshold=conf_threshold)
        vehicle_detections = [
            d for d in all_detections if d.get("object_type", "").lower() in VEHICLE_CLASSES
        ]

        # Edge case 1: No vehicle detected in frame
        if not vehicle_detections:
            return {
                "vehicle_type": None,
                "vehicle_confidence": 0.0,
                "plate_text": None,
                "plate_confidence": 0.0,
                "plate_bbox": None,
                "timestamp": now_str
            }

        # Select highest confidence vehicle detection
        primary_vehicle = max(vehicle_detections, key=lambda x: x.get("confidence", 0.0))
        vehicle_type = primary_vehicle.get("object_type", "car")
        vehicle_conf = float(primary_vehicle.get("confidence", 0.0))

        # -------------------------------------------------------------
        # Step 2: License Plate Detection & ROI Extraction
        # -------------------------------------------------------------
        plate_candidates = plate_detector.detect_plates_in_vehicle(pil_img, primary_vehicle)

        # Edge case 2: No plate region found
        if not plate_candidates:
            return {
                "vehicle_type": vehicle_type,
                "vehicle_confidence": vehicle_conf,
                "plate_text": None,
                "plate_confidence": 0.0,
                "plate_bbox": None,
                "timestamp": now_str
            }

        best_plate_cand = plate_candidates[0]
        plate_bbox = best_plate_cand["plate_bbox"]
        plate_conf = best_plate_cand["plate_confidence"]
        plate_crop = best_plate_cand["plate_image"]

        # -------------------------------------------------------------
        # Step 3 & 4: Image Preprocessing + PaddleOCR Extraction
        # -------------------------------------------------------------
        extracted_text, ocr_conf = ocr_engine.read_plate(plate_crop)

        # Combine detection and OCR confidence
        final_plate_conf = round((plate_conf + ocr_conf) / 2.0, 2) if extracted_text else plate_conf

        # -------------------------------------------------------------
        # [EVENT INTEGRATION HOOK]
        # If plate is recognized, record entry/movement event in Supabase
        # (Note: Unreadable plates are NOT treated as suspicious automatically)
        # -------------------------------------------------------------
        if extracted_text and final_plate_conf >= 0.50:
            logger.info(f"ANPR Plate Recognized: '{extracted_text}' on {vehicle_type} (Conf: {final_plate_conf})")

        return {
            "vehicle_type": vehicle_type,
            "vehicle_confidence": vehicle_conf,
            "plate_text": extracted_text,
            "plate_confidence": final_plate_conf,
            "plate_bbox": plate_bbox,
            "timestamp": now_str
        }


# Global Singleton
anpr_service = ANPRService()
