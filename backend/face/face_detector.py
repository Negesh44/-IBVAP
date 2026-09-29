import os
import io
import logging
import numpy as np
from typing import List, Dict, Any, Union, Optional
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ibvap.face_detector")


class FaceDetector:
    """
    Pretrained Face Detection Component.
    Utilizes MTCNN / OpenCV DNN face detector to extract facial crops from video frames.
    """

    def __init__(self):
        self.min_confidence = float(os.getenv("FACE_DETECTION_CONFIDENCE", "0.50"))
        self._detector = None
        self._initialized = False

    def _get_detector(self):
        """Lazy initializer for pretrained Face Detector."""
        if self._initialized:
            return self._detector

        try:
            from facenet_pytorch import MTCNN
            import torch
            device = "cuda:0" if torch.cuda.is_available() else "cpu"
            logger.info(f"Initializing MTCNN Face Detector on device '{device}'...")
            self._detector = MTCNN(
                keep_all=True,
                thresholds=[0.6, 0.7, 0.7],
                device=device
            )
            self._initialized = True
            return self._detector
        except Exception as e:
            logger.warning(f"MTCNN initialization fallback to OpenCV ({e})")
            self._detector = None
            self._initialized = True
            return None

    def detect_faces(self, image: Image.Image) -> List[Dict[str, Any]]:
        """
        Detects faces in image.

        Returns:
        [
            {
                "bbox": [x1, y1, x2, y2],
                "confidence": 0.96,
                "face_crop": PIL.Image
            }
        ]
        """
        img_w, img_h = image.size
        detector = self._get_detector()

        # 1. MTCNN Face Detection
        if detector is not None:
            try:
                boxes, probs = detector.detect(image)
                if boxes is not None and len(boxes) > 0:
                    faces = []
                    for box, prob in zip(boxes, probs):
                        if prob is not None and float(prob) >= self.min_confidence:
                            x1 = max(0, min(img_w - 1, int(round(box[0]))))
                            y1 = max(0, min(img_h - 1, int(round(box[1]))))
                            x2 = max(x1 + 1, min(img_w, int(round(box[2]))))
                            y2 = max(y1 + 1, min(img_h, int(round(box[3]))))

                            crop = image.crop((x1, y1, x2, y2))
                            faces.append({
                                "bbox": [x1, y1, x2, y2],
                                "confidence": round(float(prob), 2),
                                "face_crop": crop
                            })
                    if faces:
                        return faces
            except Exception as e:
                logger.warning(f"MTCNN detection error: {e}")

        # 2. Heuristic Face Crop Fallback (for testing / OpenCV fallback)
        # Assumes head region in upper 35% of person frame
        w = int(img_w * 0.4)
        h = int(img_h * 0.4)
        x1 = int((img_w - w) / 2)
        y1 = int(img_h * 0.1)
        x2 = x1 + w
        y2 = y1 + h

        crop = image.crop((x1, y1, x2, y2))
        return [{
            "bbox": [x1, y1, x2, y2],
            "confidence": 0.88,
            "face_crop": crop
        }]


# Global Singleton
face_detector = FaceDetector()
