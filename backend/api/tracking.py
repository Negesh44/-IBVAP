from fastapi import APIRouter, UploadFile, File, Query, HTTPException, status
from typing import Optional
from models.schemas import TrackResponse
from tracking.tracker_service import tracker_service

router = APIRouter(prefix="/api/track", tags=["Multi-Object Tracking (ByteTrack)"])


@router.post("", response_model=TrackResponse, summary="Run YOLO detection + ByteTrack tracking on frame")
async def track_frame(
    file: UploadFile = File(..., description="Video frame image file (JPEG, PNG, WEBP)"),
    camera_id: str = Query("default_camera", description="Unique camera ID to maintain persistent tracking state"),
    confidence: Optional[float] = Query(None, ge=0.05, le=0.99, description="Confidence threshold override")
):
    """
    Executes real-time Multi-Object Tracking (ByteTrack) on an incoming video frame.
    
    Pipeline:
    1. Image Decoding
    2. YOLO Object Detection (Target classes: person, car, truck, bus, motorcycle)
    3. ByteTrack Dual-Stage IoU Association + Kalman Filter Update
    4. Outputs stable, persistent Track IDs across consecutive frames.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        allowed_exts = (".jpg", ".jpeg", ".png", ".webp", ".bmp")
        if not file.filename or not file.filename.lower().endswith(allowed_exts):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file must be a valid image format."
            )

    try:
        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty image payload received."
            )

        result = tracker_service.process_and_track_frame(
            image_bytes=image_bytes,
            camera_id=camera_id,
            conf_threshold=confidence
        )
        return result

    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tracking input error: {ve}"
        )
    except FileNotFoundError as fnf:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"YOLO Model Error: {fnf}. Ensure YOLO_MODEL_PATH is configured."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Tracking pipeline error: {e}"
        )


@router.post("/reset/{camera_id}", summary="Reset tracking state for a camera")
async def reset_camera_tracking(camera_id: str):
    """
    Resets Kalman filter states and clears active track IDs for a specific camera stream.
    """
    tracker_service.reset_camera_tracker(camera_id)
    return {
        "camera_id": camera_id,
        "status": "reset",
        "message": f"Tracking state successfully cleared for camera '{camera_id}'"
    }
