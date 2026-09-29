import io
import logging
from typing import Optional, Dict, Any, Union
from PIL import Image
import numpy as np
from events.event_rules import EventRulesConfig

logger = logging.getLogger("ibvap.night_detection")


class NightMovementDetector:
    """
    Evaluates ambient lighting conditions and triggers non-hostile night movement events.
    """

    def __init__(self, brightness_threshold: Optional[float] = None):
        self.brightness_threshold = brightness_threshold or EventRulesConfig.NIGHT_BRIGHTNESS_THRESHOLD

    def calculate_image_brightness(self, image_input: Union[bytes, Image.Image, np.ndarray]) -> float:
        """
        Computes the mean grayscale luminance of an image (0 = pure black, 255 = pure white).
        """
        try:
            if isinstance(image_input, bytes):
                pil_img = Image.open(io.BytesIO(image_input)).convert("L")
                arr = np.array(pil_img, dtype=np.float32)
            elif isinstance(image_input, Image.Image):
                arr = np.array(image_input.convert("L"), dtype=np.float32)
            elif isinstance(image_input, np.ndarray):
                if len(image_input.shape) == 3:
                    # RGB to grayscale luminosity conversion
                    arr = (
                        image_input[:, :, 0] * 0.299 +
                        image_input[:, :, 1] * 0.587 +
                        image_input[:, :, 2] * 0.114
                    )
                else:
                    arr = image_input.astype(np.float32)
            else:
                return 128.0

            return float(np.mean(arr))
        except Exception as e:
            logger.warning(f"Failed to compute image brightness: {e}")
            return 128.0

    def is_low_light(self, brightness_value: float) -> bool:
        """
        Returns True if the ambient frame luminance is below configured night threshold.
        """
        return brightness_value <= self.brightness_threshold

    def evaluate_night_movement(
        self,
        brightness_value: Optional[float] = None,
        image_input: Optional[Union[bytes, Image.Image, np.ndarray]] = None,
        object_type: str = "person"
    ) -> Dict[str, Any]:
        """
        Determines if a detected entity represents a low-light / night movement event.
        """
        if brightness_value is None and image_input is not None:
            brightness_value = self.calculate_image_brightness(image_input)
        elif brightness_value is None:
            # Default to daylight ambient if unspecified
            brightness_value = 120.0

        is_night = self.is_low_light(brightness_value)
        is_relevant_object = object_type.lower() in ("person", "car", "truck", "motorcycle", "bus")

        return {
            "is_night": is_night,
            "brightness": round(brightness_value, 2),
            "threshold": self.brightness_threshold,
            "triggers_night_movement": is_night and is_relevant_object
        }


# Global singleton night detector
night_movement_detector = NightMovementDetector()
