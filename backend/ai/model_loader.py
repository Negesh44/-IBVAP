import os
import logging
from pathlib import Path
from typing import Optional, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ibvap.model_loader")


class ModelLoader:
    """
    Manages loading and hardware device allocation (CUDA / CPU) for YOLO models.
    Lazy-loads the model only when first needed (does NOT run during FastAPI startup).
    """

    def __init__(self):
        self._model: Optional[Any] = None
        self._device: Optional[str] = None
        self._is_loaded: bool = False

    def get_device(self) -> str:
        """
        Auto-detects CUDA GPU availability.
        """
        if self._device is not None:
            return self._device

        try:
            import torch
            if torch.cuda.is_available():
                self._device = "cuda:0"
                logger.info(f"CUDA GPU detected: {torch.cuda.get_device_name(0)}")
            else:
                self._device = "cpu"
                logger.info("CUDA not available. Using CPU for inference.")
        except Exception as e:
            logger.warning(f"Could not check PyTorch CUDA status ({e}). Defaulting to CPU.")
            self._device = "cpu"

        return self._device

    def get_model_path(self) -> str:
        """
        Retrieves the model path from YOLO_MODEL_PATH environment variable.
        """
        model_path = os.getenv("YOLO_MODEL_PATH", "weights/best.pt")
        return model_path

    def load_model(self) -> Any:
        """
        Loads the YOLO weights file onto the detected device.
        """
        if self._model is not None:
            return self._model

        model_path = self.get_model_path()
        device = self.get_device()

        # Check if file exists
        path_obj = Path(model_path)
        if not path_obj.is_file():
            # If path doesn't exist, check default fallback or standard yolov8n.pt
            fallback_path = Path("weights/yolov8n.pt")
            if fallback_path.is_file():
                model_path = str(fallback_path)
                logger.warning(f"Specified model '{path_obj}' not found. Falling back to '{model_path}'")
            else:
                logger.warning(
                    f"YOLO model weights file '{model_path}' not found on disk. "
                    "Please set YOLO_MODEL_PATH in .env to a valid .pt weights file."
                )
                raise FileNotFoundError(
                    f"Model weights file not found at '{model_path}'. "
                    "Ensure YOLO_MODEL_PATH is configured in backend/.env."
                )

        try:
            from ultralytics import YOLO
            logger.info(f"Loading YOLO model from '{model_path}' on device '{device}'...")
            self._model = YOLO(model_path)
            self._is_loaded = True
            logger.info("YOLO model loaded successfully into memory.")
            return self._model
        except ImportError:
            logger.error("The 'ultralytics' library is not installed. Run 'pip install ultralytics'.")
            raise RuntimeError("ultralytics package is required for YOLO inference.")
        except Exception as e:
            logger.error(f"Failed to load YOLO model from '{model_path}': {e}")
            raise RuntimeError(f"Error loading model weights: {e}")

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded


# Singleton instance
model_loader = ModelLoader()
