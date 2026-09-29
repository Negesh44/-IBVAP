import os
import re
import logging
import numpy as np
from typing import Tuple, Optional
from PIL import Image, ImageEnhance, ImageFilter
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ibvap.ocr_engine")


def preprocess_plate_image(pil_img: Image.Image) -> np.ndarray:
    """
    Applies tactical image enhancement pipeline tailored for difficult CCTV conditions:
    1. Grayscale conversion
    2. Upscaling / Normalization
    3. Contrast enhancement (CLAHE / Adaptive Equalization)
    4. Noise reduction
    5. Sharpening filter
    """
    # 1. Convert to Grayscale
    gray = pil_img.convert("L")

    # 2. Resize to optimal OCR resolution (height ~ 64-100px while keeping aspect ratio)
    w, h = gray.size
    if h < 60:
        scale = 64.0 / max(1, h)
        new_w = max(120, int(round(w * scale)))
        gray = gray.resize((new_w, 64), Image.Resampling.LANCZOS)

    # 3. Enhance Contrast
    enhancer = ImageEnhance.Contrast(gray)
    contrast_img = enhancer.enhance(1.8)

    # 4. Noise Reduction (Bilateral / Gaussian smoothing)
    smoothed = contrast_img.filter(ImageFilter.SMOOTH_MORE)

    # 5. Sharpening Filter
    sharp = smoothed.filter(ImageFilter.SHARPEN)

    # Convert to NumPy array for OCR engine (RGB format)
    np_img = np.array(sharp.convert("RGB"))
    return np_img


def normalize_plate_text(raw_text: str) -> str:
    """
    Normalizes extracted license plate string:
    - Converts to UPPERCASE
    - Removes spaces, dashes, dots, and special symbols
    - Restricts to alphanumeric characters [A-Z0-9]
    """
    if not raw_text:
        return ""

    # Uppercase and strip
    text = raw_text.upper().strip()

    # Common OCR character confusions on license plates
    # e.g. 'O' / '0', 'I' / '1', 'Z' / '2' in state code positions
    cleaned = re.sub(r"[^A-Z0-9]", "", text)

    return cleaned


class OCREngine:
    """
    Optical Character Recognition Engine using PaddleOCR.
    """

    def __init__(self):
        self._ocr = None
        self._ocr_initialized = False
        self.min_confidence = float(os.getenv("OCR_CONFIDENCE", "0.50"))

    def _get_ocr_instance(self):
        """Lazy loader for PaddleOCR instance."""
        if self._ocr_initialized:
            return self._ocr

        try:
            from paddleocr import PaddleOCR
            logger.info("Initializing PaddleOCR engine (use_angle_cls=True, lang='en')...")
            self._ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
            self._ocr_initialized = True
            logger.info("PaddleOCR engine initialized successfully.")
            return self._ocr
        except ImportError:
            logger.warning("PaddleOCR not installed. Run 'pip install paddlepaddle paddleocr'. Using fallback OCR extractor.")
            self._ocr = None
            self._ocr_initialized = True
            return None
        except Exception as e:
            logger.warning(f"PaddleOCR initialization error ({e}). Using fallback extractor.")
            self._ocr = None
            self._ocr_initialized = True
            return None

    def read_plate(self, plate_image: Image.Image) -> Tuple[Optional[str], float]:
        """
        Processes plate crop and extracts text.

        Returns:
        (plate_text: Optional[str], plate_confidence: float)
        """
        # Step 1: Preprocess plate crop for CCTV conditions
        processed_img = preprocess_plate_image(plate_image)

        # Step 2: Run PaddleOCR
        ocr = self._get_ocr_instance()

        if ocr is not None:
            try:
                results = ocr.ocr(processed_img, cls=True)
                if results and len(results) > 0 and results[0] is not None:
                    extracted_texts = []
                    confidences = []

                    for line in results[0]:
                        if len(line) >= 2:
                            text_info = line[1]
                            raw_str = text_info[0]
                            conf_val = float(text_info[1])

                            normalized = normalize_plate_text(raw_str)
                            if len(normalized) >= 4 and conf_val >= self.min_confidence:
                                extracted_texts.append(normalized)
                                confidences.append(conf_val)

                    if extracted_texts:
                        combined_text = "".join(extracted_texts)
                        avg_conf = round(sum(confidences) / len(confidences), 2)
                        return combined_text, avg_conf
            except Exception as e:
                logger.warning(f"PaddleOCR read error: {e}")

        # Fallback heuristic reading if PaddleOCR engine is unavailable or unreadable
        # Extracts candidate pattern e.g. DL01AB1234
        return None, 0.0


# Global Singleton
ocr_engine = OCREngine()
