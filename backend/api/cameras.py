import re
from fastapi import APIRouter, HTTPException, Query, Depends, status
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from models.schemas import CameraSchema
from services.supabase_service import supabase_service
from auth.dependencies import get_current_user, require_commander, require_admin, CurrentUser
from utils.security_validation import validate_camera_id

router = APIRouter(prefix="/api/cameras", tags=["Cameras"])


class CameraCreateUpdateRequest(BaseModel):
    camera_code: str = Field(..., description="Unique camera identifier e.g. BOP-005")
    name: str = Field(..., min_length=2, max_length=100)
    location: str = Field(..., min_length=2, max_length=200)
    rtsp_url: Optional[str] = Field(None, description="RTSP video source URL")
    status: Optional[str] = Field("ONLINE", description="ONLINE, WARNING, OFFLINE")
    resolution: Optional[str] = "1920x1080 (1080p)"
    fps: Optional[int] = Field(30, ge=1, le=120)


def sanitize_camera_for_client(cam: Dict[str, Any], user_role: str) -> Dict[str, Any]:
    """
    Strips or masks raw RTSP credentials to protect camera fleet network security.
    """
    sanitized = dict(cam)
    if "rtsp_url" in sanitized and sanitized["rtsp_url"]:
        # Only ADMIN or secure backend services see raw RTSP passwords
        if user_role not in ("ADMIN", "COMMANDER"):
            sanitized["rtsp_url"] = re.sub(r"://([^:]+):([^@]+)@", r"://\1:******@", sanitized["rtsp_url"])
    return sanitized


@router.get("", response_model=List[CameraSchema], summary="List all operational cameras")
async def list_cameras(current_user: CurrentUser = Depends(get_current_user)):
    """
    Fetches the list of border surveillance cameras from Supabase.
    Sanitizes RTSP credentials to prevent credential exposure to browsers.
    """
    cameras_data = supabase_service.get_cameras()
    return [sanitize_camera_for_client(cam, current_user.role) for cam in cameras_data]


@router.get("/{camera_id}", response_model=CameraSchema, summary="Get camera by ID")
async def get_camera(
    camera_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Fetches camera details by its ID or camera code with input validation.
    """
    clean_id = validate_camera_id(camera_id)
    cam = supabase_service.get_camera_by_id(clean_id)
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera with ID '{clean_id}' not found.")
    return sanitize_camera_for_client(cam, current_user.role)


@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED, summary="Register new camera")
async def create_camera(
    payload: CameraCreateUpdateRequest,
    current_user: CurrentUser = Depends(require_commander)
):
    """
    Registers a new camera in the border surveillance fleet.
    Requires ADMIN or COMMANDER privileges.
    """
    clean_code = validate_camera_id(payload.camera_code)
    
    new_cam = {
        "id": clean_code,
        "camera_code": clean_code,
        "name": payload.name.strip(),
        "location": payload.location.strip(),
        "rtsp_url": payload.rtsp_url,
        "status": payload.status.upper(),
        "resolution": payload.resolution,
        "fps": payload.fps
    }

    if supabase_service.is_connected and supabase_service.client:
        try:
            res = supabase_service.client.table("cameras").insert(new_cam).execute()
            if res.data:
                new_cam = res.data[0]
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to create camera: {e}")

    supabase_service.create_audit_log(
        action="CAMERA_CREATED",
        category="CAMERA",
        record_id=clean_code,
        details=f"Camera '{payload.name}' ({clean_code}) registered at {payload.location}",
        user_name=current_user.name,
        user_role=current_user.role
    )

    return {"status": "SUCCESS", "camera": sanitize_camera_for_client(new_cam, current_user.role)}


@router.put("/{camera_id}", response_model=Dict[str, Any], summary="Update camera configuration")
async def update_camera(
    camera_id: str,
    payload: CameraCreateUpdateRequest,
    current_user: CurrentUser = Depends(require_commander)
):
    """
    Updates configuration for an existing camera.
    Requires ADMIN or COMMANDER privileges.
    """
    clean_id = validate_camera_id(camera_id)
    existing = supabase_service.get_camera_by_id(clean_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Camera with ID '{clean_id}' not found.")

    updated_fields = {
        "name": payload.name.strip(),
        "location": payload.location.strip(),
        "status": payload.status.upper(),
        "fps": payload.fps
    }
    if payload.rtsp_url:
        updated_fields["rtsp_url"] = payload.rtsp_url

    if supabase_service.is_connected and supabase_service.client:
        try:
            supabase_service.client.table("cameras").update(updated_fields).eq("id", clean_id).execute()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to update camera: {e}")

    supabase_service.create_audit_log(
        action="CAMERA_UPDATED",
        category="CAMERA",
        record_id=clean_id,
        details=f"Camera '{clean_id}' updated by {current_user.name}",
        user_name=current_user.name,
        user_role=current_user.role
    )

    return {"status": "SUCCESS", "message": f"Camera '{clean_id}' updated successfully."}


@router.delete("/{camera_id}", summary="Delete camera")
async def delete_camera(
    camera_id: str,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Decommission and remove a camera from the fleet.
    Requires ADMIN privileges.
    """
    clean_id = validate_camera_id(camera_id)
    existing = supabase_service.get_camera_by_id(clean_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Camera with ID '{clean_id}' not found.")

    if supabase_service.is_connected and supabase_service.client:
        try:
            supabase_service.client.table("cameras").delete().eq("id", clean_id).execute()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to delete camera: {e}")

    supabase_service.create_audit_log(
        action="CAMERA_DELETED",
        category="CAMERA",
        record_id=clean_id,
        details=f"Camera '{clean_id}' decommissioned and deleted by Admin {current_user.name}",
        user_name=current_user.name,
        user_role=current_user.role
    )

    return {"status": "SUCCESS", "message": f"Camera '{clean_id}' decommissioned successfully."}
