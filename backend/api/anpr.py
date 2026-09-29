from fastapi import APIRouter, UploadFile, File, Query, HTTPException, status, Depends
from typing import Optional
from models.schemas import ANPRResponse
from anpr.anpr_service import anpr_service
from auth.dependencies import get_current_user, CurrentUser
from utils.security_validation import validate_image_upload

router = APIRouter(prefix="/api/anpr", tags=["Automatic Number Plate Recognition (ANPR)"])


@router.post("", response_model=ANPRResponse, summary="Detect vehicle and extract license plate text")
async def detect_license_plate(
    file: UploadFile = File(..., description="CCTV Image frame containing a vehicle"),
    confidence: Optional[float] = Query(None, ge=0.05, le=0.99, description="Confidence threshold override"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Executes end-to-end Automatic Number Plate Recognition (ANPR) on CCTV frame for authenticated operators:
    
    Pipeline:
    1. Image Input & Upload Validation
    2. YOLO Vehicle Detection (car, truck, bus, motorcycle)
    3. License Plate Detection & ROI Extraction
    4. Image Preprocessing (Grayscale, Normalization, Contrast CLAHE, Sharpening, Denoising)
    5. PaddleOCR Character Recognition
    6. Text Normalization (UPPERCASE alphanumeric)
    """
    image_bytes = await file.read()
    validate_image_upload(image_bytes, filename=file.filename, content_type=file.content_type, max_size_mb=10)

    try:
        result = anpr_service.process_anpr_frame(
            image_bytes=image_bytes,
            conf_threshold=confidence
        )
        return result

    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"ANPR input error: {ve}")
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Model weights not found: {fnf}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"ANPR processing error: {e}")
