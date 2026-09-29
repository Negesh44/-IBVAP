import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image
from dotenv import load_dotenv

from ai.model_loader import model_loader

load_dotenv()

logger = logging.getLogger("ibvap.plate_detector")


class LicensePlateDetector:
    """
    License Plate Detection Component.
    Designed to load a dedicated license plate YOLO model via ANPR_MODEL_PATH.
    If no dedicated model is configured, extracts candidate license plate ROIs
    from detected vehicle bounding boxes (car, truck, bus, motorcycle).
    """

    def __init__(self):
        self._plate_model = None
        self._model_loaded = False
        self.default_conf = float(os.getenv("ANPR_CONFIDENCE", "0.40"))

    def _load_dedicated_plate_model(self):
        """Loads dedicated YOLO model if ANPR_MODEL_PATH is configured."""
        model_path = os.getenv("ANPR_MODEL_PATH", "").strip()
        if not model_path:
            return None

        if self._model_loaded:
            return self._plate_model

        path_obj = Path(model_path)
        if not path_obj.is_file():
            logger.warning(
                f"Configured ANPR_MODEL_PATH '{model_path}' not found. "
                "Using vehicle ROI extraction fallback."
            )
            return None

        try:
            from ultralytics import YOLO
            logger.info(f"Loading dedicated License Plate YOLO model from '{model_path}'...")
            device = model_loader.get_device()
            self._plate_model = YOLO(model_path)
            self._model_loaded = True
            logger.info("Dedicated License Plate YOLO model loaded successfully.")
            return self._plate_model
        except Exception as e:
            logger.warning(f"Could not load dedicated ANPR model ({e}). Using ROI fallback.")
            return None

    def detect_plates_in_vehicle(
        self,
        full_image: Image.Image,
        vehicle_det: Dict[str, Any],
        conf_threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Detects license plates inside a detected vehicle bounding box.

        Parameters:
        - full_image: Original PIL Image
        - vehicle_det: Detection item dictionary {"object_type": "car", "confidence": 0.94, "bbox": [x1, y1, x2, y2]}

        Returns:
        List of plate candidate dictionaries:
        [
            {
                "plate_bbox": [x1, y1, x2, y2],
                "plate_confidence": 0.91,
                "plate_image": PIL.Image
            }
        ]
        """
        conf = conf_threshold if conf_threshold is not None else self.default_conf
        vx1, vy1, vx2, vy2 = vehicle_det["bbox"]
        img_w, img_h = full_image.size

        # Clamp vehicle box to image boundaries
        vx1 = max(0, min(img_w - 1, vx1))
        vy1 = max(0, min(img_h - 1, vy1))
        vx2 = max(vx1 + 1, min(img_w, vx2))
        vy2 = max(vy1 + 1, min(img_h, vy2))

        v_width = vx2 - vx1
        v_height = vy2 - vy1

        # Crop vehicle region
        vehicle_crop = full_image.crop((vx1, vy1, vx2, vy2))

        # 1. Dedicated YOLO Plate Model (if available)
        plate_model = self._load_dedicated_plate_model()
        if plate_model is not None:
            try:
                results = plate_model.predict(
                    source=vehicle_crop,
                    conf=conf,
                    verbose=False
                )
                if results and len(results) > 0 and results[0].boxes is not None:
                    candidates = []
                    for box in results[0].boxes:
                        pxyxy = box.xyxy[0].tolist()
                        pconf = float(box.conf[0].item())
                        # Map back to global frame coordinates
                        px1 = int(round(vx1 + pxyxy[0]))
                        py1 = int(round(vy1 + pxyxy[1]))
                        px2 = int(round(vx1 + pxyxy[2]))
                        py2 = int(round(vy1 + pxyxy[3]))

                        plate_crop = full_image.crop((px1, py1, px2, py2))
                        candidates.append({
                            "plate_bbox": [px1, py1, px2, py2],
                            "plate_confidence": round(pconf, 2),
                            "plate_image": plate_crop
                        })
                    if candidates:
                        return candidates
            except Exception as e:
                logger.warning(f"Dedicated plate model inference error: {e}")

        # 2. Heuristic Vehicle License Plate ROI Fallback:
        # Standard vehicle license plates are positioned in the bottom 40% height and center 70% width of the vehicle
        px1 = int(round(vx1 + v_width * 0.15))
        px2 = int(round(vx1 + v_width * 0.85))
        py1 = int(round(vy1 + v_height * 0.60))
        py2 = int(round(vy1 + v_height * 0.95))

        # Ensure valid dimensions
        px1 = max(0, min(img_w - 2, px1))
        py1 = max(0, min(img_h - 2, py1))
        px2 = max(px1 + 1, min(img_w, px2))
        py2 = max(py1 + 1, min(img_h, py2))

        plate_crop = full_image.crop((px1, py1, px2, py2))

        return [{
            "plate_bbox": [px1, py1, px2, py2],
            "plate_confidence": round(vehicle_det.get("confidence", 0.85) * 0.92, 2),
            "plate_image": plate_crop
        }]


# Global Singleton
plate_detector = LicensePlateDetector()
