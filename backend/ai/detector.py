import os
import io
import time
import logging
from typing import List, Dict, Any, Union, Optional
from PIL import Image
from dotenv import load_dotenv

from ai.model_loader import model_loader

load_dotenv()

logger = logging.getLogger("ibvap.detector")

# Standard Target Classes:
# 0 = person
# 1 = car
# 2 = truck
# 3 = bus
# 4 = motorcycle
TARGET_CLASSES = {
    0: "person",
    1: "car",
    2: "truck",
    3: "bus",
    4: "motorcycle"
}

# Standard COCO index to Target Class mapping (if standard COCO weights are used)
COCO_TO_TARGET = {
    0: (0, "person"),
    2: (1, "car"),
    7: (2, "truck"),
    5: (3, "bus"),
    3: (4, "motorcycle")
}


class YOLODetector:
    """
    Object Detector wrapping YOLO models.
    Provides detect_frame() to perform bounding box inference on 5 target classes.
    """

    def __init__(self):
        self.default_conf = float(os.getenv("YOLO_CONFIDENCE", "0.40"))

    def _convert_input_to_image(self, frame: Union[bytes, Image.Image, Any]) -> Image.Image:
        """
        Converts raw bytes or numpy array into a PIL Image.
        """
        if isinstance(frame, bytes):
            try:
                img = Image.open(io.BytesIO(frame))
                return img.convert("RGB")
            except Exception as e:
                raise ValueError(f"Invalid or corrupted image bytes: {e}")
        elif isinstance(frame, Image.Image):
            return frame.convert("RGB")
        elif hasattr(frame, "__array__"):
            # Numpy array / OpenCV BGR or RGB
            import numpy as np
            arr = np.asarray(frame)
            if len(arr.shape) == 3 and arr.shape[2] == 3:
                # Assuming RGB or BGR
                return Image.fromarray(arr).convert("RGB")
            elif len(arr.shape) == 2:
                return Image.fromarray(arr).convert("RGB")
            else:
                raise ValueError(f"Unsupported array shape for frame: {arr.shape}")
        else:
            raise ValueError(f"Unsupported frame type: {type(frame)}")

    def detect_frame(
        self,
        frame: Union[bytes, Image.Image, Any],
        conf_threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Performs object detection on a single frame.

        Parameters:
        - frame: Raw image bytes, PIL Image, or numpy array.
        - conf_threshold: Optional confidence threshold (defaults to YOLO_CONFIDENCE env var e.g. 0.40).

        Returns:
        List of detection dictionaries:
        [
            {
                "class_id": 0,
                "object_type": "person",
                "confidence": 0.96,
                "bbox": [x1, y1, x2, y2]
            }
        ]
        """
        conf = conf_threshold if conf_threshold is not None else self.default_conf
        image = self._convert_input_to_image(frame)
        device = model_loader.get_device()

        # Load YOLO model
        model = model_loader.load_model()

        # Run inference (device set automatically)
        results = model.predict(
            source=image,
            conf=conf,
            device=device,
            verbose=False
        )

        detections: List[Dict[str, Any]] = []

        if not results or len(results) == 0:
            return detections

        first_result = results[0]
        boxes = first_result.boxes

        if boxes is None:
            return detections

        model_names = model.names if hasattr(model, "names") else {}

        for box in boxes:
            raw_cls_id = int(box.cls[0].item())
            raw_conf = float(box.conf[0].item())
            xyxy = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
            bbox = [int(round(coord)) for coord in xyxy]

            class_name = model_names.get(raw_cls_id, "").lower()

            # Map to target classes
            target_class_id: Optional[int] = None
            object_type: Optional[str] = None

            # 1. Direct class id match (0..4)
            if raw_cls_id in TARGET_CLASSES:
                target_class_id = raw_cls_id
                object_type = TARGET_CLASSES[raw_cls_id]
            # 2. Match by class name
            elif class_name in ["person", "human"]:
                target_class_id = 0
                object_type = "person"
            elif class_name in ["car", "automobile"]:
                target_class_id = 1
                object_type = "car"
            elif class_name in ["truck", "lorry"]:
                target_class_id = 2
                object_type = "truck"
            elif class_name in ["bus"]:
                target_class_id = 3
                object_type = "bus"
            elif class_name in ["motorcycle", "motorbike", "bike"]:
                target_class_id = 4
                object_type = "motorcycle"
            # 3. Match from standard COCO index
            elif raw_cls_id in COCO_TO_TARGET:
                target_class_id, object_type = COCO_TO_TARGET[raw_cls_id]

            # If class is one of the 5 target classes, add to detections
            if target_class_id is not None and object_type is not None:
                detections.append({
                    "class_id": target_class_id,
                    "object_type": object_type,
                    "confidence": round(raw_conf, 2),
                    "bbox": bbox
                })

        return detections


# Singleton detector instance
yolo_detector = YOLODetector()

# Top-level reusable function
def detect_frame(frame: Union[bytes, Image.Image, Any], conf_threshold: Optional[float] = None) -> List[Dict[str, Any]]:
    """
    Reusable detection function.
    """
    return yolo_detector.detect_frame(frame, conf_threshold=conf_threshold)
