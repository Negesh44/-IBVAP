import io
import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from PIL import Image

from ai.detector import detect_frame

logger = logging.getLogger("ibvap.inference_service")


class InferenceService:
    """
    Service coordinating frame inference requests and execution telemetry.
    """

    def process_image(
        self,
        image_bytes: bytes,
        conf_threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Executes YOLO object detection on an uploaded image.

        Returns:
        {
            "detections": [...],
            "inference_time_ms": 18.4,
            "image_width": 1920,
            "image_height": 1080,
            "timestamp": "2026-09-29T08:00:00Z"
        }
        """
        # Validate image format and extract dimensions
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            width, height = pil_img.size
        except Exception as e:
            raise ValueError(f"Failed to decode uploaded image: {e}")

        start_time = time.perf_counter()

        # Run detection
        detections = detect_frame(pil_img, conf_threshold=conf_threshold)

        inference_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
        now_str = datetime.now(timezone.utc).isoformat()

        return {
            "detections": detections,
            "inference_time_ms": inference_time_ms,
            "image_width": width,
            "image_height": height,
            "timestamp": now_str
        }


inference_service = InferenceService()
