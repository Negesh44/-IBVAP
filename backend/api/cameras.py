from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from models.schemas import CameraSchema
from services.supabase_service import supabase_service

router = APIRouter(prefix="/api/cameras", tags=["Cameras"])


@router.get("", response_model=List[CameraSchema], summary="List all operational cameras")
async def list_cameras():
    """
    Fetches the list of border surveillance cameras from the Supabase database.
    """
    cameras_data = supabase_service.get_cameras()
    return cameras_data


@router.get("/{camera_id}", response_model=CameraSchema, summary="Get camera by ID")
async def get_camera(camera_id: str):
    """
    Fetches camera details by its ID or camera code.
    """
    cam = supabase_service.get_camera_by_id(camera_id)
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera with ID '{camera_id}' not found.")
    return cam
