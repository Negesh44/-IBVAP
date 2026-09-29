import io
import time
import asyncio
from fastapi import APIRouter, HTTPException, status, Query, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from typing import List, Dict, Any, Optional
from PIL import Image, ImageDraw

from streaming.stream_manager import stream_manager
from auth.dependencies import get_current_user, require_operator, CurrentUser
from utils.security_validation import validate_camera_id

router = APIRouter(prefix="/api/streams", tags=["Real-Time CCTV Streams"])


@router.post("/start/{camera_id}", summary="Start real-time ingestion & AI vision pipeline for a camera")
async def start_stream(
    camera_id: str,
    rtsp_url: Optional[str] = Query(None, description="Optional RTSP URL override"),
    current_user: CurrentUser = Depends(require_operator)
):
    """
    Initializes a dedicated background CameraWorker.
    Requires ADMIN, COMMANDER, or OPERATOR privileges (VIEWER forbidden).
    """
    clean_id = validate_camera_id(camera_id)
    try:
        result = stream_manager.start_camera(camera_id=clean_id, rtsp_url=rtsp_url)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start camera stream worker: {e}"
        )


@router.post("/stop/{camera_id}", summary="Stop real-time ingestion worker for a camera")
async def stop_stream(
    camera_id: str,
    current_user: CurrentUser = Depends(require_operator)
):
    """
    Halts worker thread, releases OpenCV capture handles, and clears frame queues.
    Requires ADMIN, COMMANDER, or OPERATOR privileges.
    """
    clean_id = validate_camera_id(camera_id)
    try:
        result = stream_manager.stop_camera(camera_id=clean_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop camera stream worker: {e}"
        )


@router.get("/status", summary="Get status of all camera streams")
async def get_stream_statuses(current_user: CurrentUser = Depends(get_current_user)):
    """
    Returns running status, actual FPS, and connection health for all registered CCTV cameras.
    """
    return stream_manager.get_all_statuses()


@router.get("/health", summary="Streaming subsystem health diagnostics")
async def get_stream_health(current_user: CurrentUser = Depends(get_current_user)):
    """
    Returns fleet health, GPU availability, target FPS, and per-camera pipeline telemetry.
    """
    return stream_manager.get_health()


@router.get("/{camera_id}/preview", summary="MJPEG live video preview for local/demo testing")
async def preview_stream(camera_id: str):
    """
    Streams multipart/x-mixed-replace JPEG video frames for browser inspection and local testing.
    RTSP URLs remain confidential and are never exposed directly to the client.
    """
    clean_id = validate_camera_id(camera_id)

    async def frame_generator():
        while True:
            jpeg_bytes = stream_manager.get_latest_preview_frame(clean_id)
            if jpeg_bytes is not None:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + jpeg_bytes + b"\r\n"
                )
            else:
                img = Image.new("RGB", (640, 360), color=(20, 25, 35))
                draw = ImageDraw.Draw(img)
                draw.text((200, 160), f"CAM: {clean_id} (STANDBY)", fill=(100, 116, 139))
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=70)
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + buf.getvalue() + b"\r\n"
                )

            await asyncio.sleep(0.1)

    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
