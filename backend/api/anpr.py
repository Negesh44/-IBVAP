from fastapi import APIRouter, UploadFile, File, Query, HTTPException, status
from typing import Optional
from models.schemas import ANPRResponse
from anpr.anpr_service import anpr_service

router = APIRouter(prefix="/api/anpr", tags=["Automatic Number Plate Recognition (ANPR)"])


@router.post("", response_model=ANPRResponse, summary="Detect vehicle and extract license plate text")
async def detect_license_plate(
    file: UploadFile = File(..., description="CCTV Image frame containing a vehicle"),
    confidence: Optional[float] = Query(None, ge=0.05, le=0.99, description="Confidence threshold override")
):
    """
    Executes end-to-end Automatic Number Plate Recognition (ANPR) on CCTV frame:
    
    Pipeline:
    1. Image Input
    2. YOLO Vehicle Detection (car, truck, bus, motorcycle)
    3. License Plate Detection & ROI Extraction
    4. Image Preprocessing (Grayscale, Normalization, Contrast CLAHE, Sharpening, Denoising)
    5. PaddleOCR Character Recognition
    6. Text Normalization (UPPERCASE alphanumeric)
    
    Returns vehicle type, plate bounding box, extracted plate string, and confidence scores.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
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

        result = anpr_service.process_anpr_frame(
            image_bytes=image_bytes,
            conf_threshold=confidence
        )
        return result

    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ANPR input error: {ve}"
        )
    except FileNotFoundError as fnf:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model weights not found: {fnf}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ANPR processing error: {e}"
        )
