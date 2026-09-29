from fastapi import APIRouter, UploadFile, File, Query, HTTPException, status, Depends
from typing import Optional
from models.schemas import TrackResponse
from tracking.tracker_service import tracker_service
from auth.dependencies import get_current_user, require_operator, CurrentUser
from utils.security_validation import validate_image_upload, validate_camera_id

router = APIRouter(prefix="/api/track", tags=["Multi-Object Tracking (ByteTrack)"])


@router.post("", response_model=TrackResponse, summary="Run YOLO detection + ByteTrack tracking on frame")
async def track_frame(
    file: UploadFile = File(..., description="Video frame image file (JPEG, PNG, WEBP)"),
    camera_id: str = Query("default_camera", description="Unique camera ID to maintain persistent tracking state"),
    confidence: Optional[float] = Query(None, ge=0.05, le=0.99, description="Confidence threshold override"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Executes real-time Multi-Object Tracking (ByteTrack) on an incoming video frame.
    Validates file upload and maintains isolated per-camera tracking Kalman state.
    """
    clean_cam_id = validate_camera_id(camera_id) if camera_id != "default_camera" else "default_camera"
    image_bytes = await file.read()
    validate_image_upload(image_bytes, filename=file.filename, content_type=file.content_type, max_size_mb=10)

    try:
        result = tracker_service.process_and_track_frame(
            image_bytes=image_bytes,
            camera_id=clean_cam_id,
            conf_threshold=confidence
        )
        return result

    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tracking input error: {ve}")
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"YOLO Model Error: {fnf}.")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Tracking pipeline error: {e}")


@router.post("/reset/{camera_id}", summary="Reset tracking state for a camera")
async def reset_camera_tracking(
    camera_id: str,
    current_user: CurrentUser = Depends(require_operator)
):
    """
    Resets Kalman filter states and clears active track IDs for a specific camera stream.
    Requires ADMIN, COMMANDER, or OPERATOR privileges.
    """
    clean_cam_id = validate_camera_id(camera_id)
    tracker_service.reset_camera_tracker(clean_cam_id)
    return {
        "camera_id": clean_cam_id,
        "status": "reset",
        "message": f"Tracking state successfully cleared for camera '{clean_cam_id}' by {current_user.name}"
    }
