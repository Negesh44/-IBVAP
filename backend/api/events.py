from fastapi import APIRouter, Query, HTTPException, status, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from models.schemas import (
    EventSchema,
    AnalyzeEventsRequest,
    AnalyzeEventsResponse,
    SecurityEventItem,
    VirtualFenceConfig
)
from services.supabase_service import supabase_service
from events.event_engine import event_engine
from events.virtual_fence import virtual_fence_manager
from auth.dependencies import get_current_user, require_operator, require_commander, CurrentUser
from utils.security_validation import validate_camera_id

router = APIRouter(prefix="/api/events", tags=["Events & Analytics Engine"])


@router.get("", response_model=List[EventSchema], summary="List security events")
async def list_events(
    limit: int = Query(50, ge=1, le=100, description="Max number of events to fetch"),
    event_type: Optional[str] = Query(None, description="Filter by event type substring"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Fetches forensic incident and recognition events from Supabase for authenticated users.
    """
    events = supabase_service.get_events(limit=limit, event_type=event_type)
    return events


@router.post("/analyze", response_model=AnalyzeEventsResponse, summary="Analyze detections & tracks against security rules")
async def analyze_events(
    request: AnalyzeEventsRequest,
    current_user: CurrentUser = Depends(require_operator)
):
    """
    Combines YOLO detections, ByteTrack tracks, and camera configurations to detect
    security-relevant events using configurable rules (Virtual Fence Intrusion, Loitering,
    Night Movement, and Stationary Person).
    Requires ADMIN, COMMANDER, or OPERATOR privileges.
    """
    clean_cam_id = validate_camera_id(request.camera_id)
    try:
        now_str = datetime.now(timezone.utc).isoformat()
        
        events = event_engine.analyze_frame(
            camera_id=clean_cam_id,
            detections=request.detections or [],
            tracks=request.tracks or [],
            frame_width=request.frame_width or 1920,
            frame_height=request.frame_height or 1080,
            brightness=request.brightness,
            persist_to_db=True
        )

        return AnalyzeEventsResponse(
            camera_id=clean_cam_id,
            events_count=len(events),
            events=[SecurityEventItem(**e) for e in events],
            timestamp=now_str
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Event analysis error: {e}"
        )


@router.post("/fence", summary="Configure virtual fence polygon for a camera")
async def configure_virtual_fence(
    config: VirtualFenceConfig,
    current_user: CurrentUser = Depends(require_commander)
):
    """
    Configures or updates a restricted spatial polygon zone for a specific camera.
    Requires ADMIN or COMMANDER privileges.
    """
    clean_cam_id = validate_camera_id(config.camera_id)
    try:
        virtual_fence_manager.set_camera_zone(clean_cam_id, config.zone)
        
        supabase_service.create_audit_log(
            action="SETTINGS_CHANGED",
            category="CONFIG",
            record_id=clean_cam_id,
            details=f"Virtual fence polygon updated ({len(config.zone)} vertices) by {current_user.name}",
            user_name=current_user.name,
            user_role=current_user.role
        )

        return {
            "status": "SUCCESS",
            "camera_id": clean_cam_id,
            "vertices_count": len(config.zone),
            "zone": config.zone,
            "message": f"Virtual fence polygon configured for camera {clean_cam_id}."
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@router.get("/fence/{camera_id}", summary="Get configured virtual fence polygon for a camera")
async def get_virtual_fence(
    camera_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Retrieves active virtual fence polygon vertices for an authenticated operator.
    """
    clean_cam_id = validate_camera_id(camera_id)
    zone = virtual_fence_manager.get_camera_zone(clean_cam_id)
    if zone is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No virtual fence configured for camera '{clean_cam_id}'."
        )
    return {
        "camera_id": clean_cam_id,
        "has_zone": True,
        "vertices_count": len(zone),
        "zone": zone
    }
