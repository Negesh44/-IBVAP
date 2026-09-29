from fastapi import APIRouter, UploadFile, File, Form, Query, HTTPException, status, Depends
from typing import List, Optional
from models.schemas import DetectionItem, DetectImageResponse
from services.detection_service import detection_service
from services.inference_service import inference_service
from auth.dependencies import get_current_user, CurrentUser
from utils.security_validation import validate_image_upload

router = APIRouter(prefix="/api", tags=["Detections & Inference"])


@router.get("/detections", response_model=List[DetectionItem], summary="Get live/recent object detections")
async def get_detections(
    camera_id: Optional[str] = Query(None, description="Filter by camera code e.g. BOP-001"),
    count: int = Query(4, ge=1, le=20, description="Number of recent detection frames"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Returns latest tracked object detections across cameras for authenticated operators.
    """
    results = [detection_service.generate_simulated_detection(camera_id) for _ in range(count)]
    return results


@router.post("/detect", response_model=DetectImageResponse, summary="Run YOLO inference on uploaded image")
async def detect_image(
    file: UploadFile = File(..., description="Image file (JPEG, PNG, WEBP) to run object detection on"),
    confidence: Optional[float] = Query(None, ge=0.05, le=0.99, description="Confidence threshold (0.05 to 0.99)"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Executes YOLO deep learning model inference on the uploaded image.
    Validates file MIME type, size limit, and prevents malicious binaries.
    """
    image_bytes = await file.read()
    validate_image_upload(image_bytes, filename=file.filename, content_type=file.content_type, max_size_mb=10)

    try:
        result = inference_service.process_image(image_bytes, conf_threshold=confidence)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Image processing error: {ve}")
    except FileNotFoundError as fnf:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"YOLO Model Error: {fnf}."
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Detection error: {e}")
