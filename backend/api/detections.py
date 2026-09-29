from fastapi import APIRouter, UploadFile, File, Form, Query, HTTPException, status
from typing import List, Optional
from models.schemas import DetectionItem, DetectImageResponse
from services.detection_service import detection_service
from services.inference_service import inference_service

router = APIRouter(prefix="/api", tags=["Detections & Inference"])


@router.get("/detections", response_model=List[DetectionItem], summary="Get live/recent object detections")
async def get_detections(
    camera_id: Optional[str] = Query(None, description="Filter by camera code e.g. BOP-001"),
    count: int = Query(4, ge=1, le=20, description="Number of recent detection frames")
):
    """
    Returns latest tracked object detections across cameras.
    Emits data matching the exact schema required for frontend rendering.
    """
    results = [detection_service.generate_simulated_detection(camera_id) for _ in range(count)]
    return results


@router.post("/detect", response_model=DetectImageResponse, summary="Run YOLO inference on uploaded image")
async def detect_image(
    file: UploadFile = File(..., description="Image file (JPEG, PNG, WEBP) to run object detection on"),
    confidence: Optional[float] = Query(None, ge=0.05, le=0.99, description="Confidence threshold (defaults to YOLO_CONFIDENCE env var e.g. 0.40)")
):
    """
    Executes YOLO deep learning model inference on the uploaded image.
    
    Target classes supported:
    - 0 = person
    - 1 = car
    - 2 = truck
    - 3 = bus
    - 4 = motorcycle
    
    Returns bounding box coordinates, detected classes, confidence scores, and latency telemetry.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        # Check filename extension if content-type header is generic
        allowed_exts = (".jpg", ".jpeg", ".png", ".webp", ".bmp")
        if not file.filename or not file.filename.lower().endswith(allowed_exts):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file must be a valid image format (JPEG, PNG, WEBP, BMP)."
            )

    try:
        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty image payload received."
            )
        
        result = inference_service.process_image(image_bytes, conf_threshold=confidence)
        return result

    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image processing error: {ve}"
        )
    except FileNotFoundError as fnf:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"YOLO Model Error: {fnf}. Please ensure YOLO_MODEL_PATH is set in backend/.env to a valid .pt weights file."
        )
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference execution failed: {re}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected server error during detection: {e}"
        )
