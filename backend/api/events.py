from fastapi import APIRouter, Query, HTTPException, status
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

router = APIRouter(prefix="/api/events", tags=["Events & Analytics Engine"])


@router.get("", response_model=List[EventSchema], summary="List security events")
async def list_events(
    limit: int = Query(50, ge=1, le=100, description="Max number of events to fetch"),
    event_type: Optional[str] = Query(None, description="Filter by event type substring")
):
    """
    Fetches forensic incident and recognition events from Supabase.
    """
    events = supabase_service.get_events(limit=limit, event_type=event_type)
    return events


@router.post("/analyze", response_model=AnalyzeEventsResponse, summary="Analyze detections & tracks against security rules")
async def analyze_events(request: AnalyzeEventsRequest):
    """
    Combines YOLO detections, ByteTrack tracks, and camera configurations to detect
    security-relevant events using configurable rules (Virtual Fence Intrusion, Loitering,
    Night Movement, and Stationary Person).
    
    Persists triggered events and high-severity alarms directly to Supabase.
    Applies configurable debouncing/cooldown to prevent duplicate alerts every frame.
    """
    try:
        now_str = datetime.now(timezone.utc).isoformat()
        
        events = event_engine.analyze_frame(
            camera_id=request.camera_id,
            detections=request.detections or [],
            tracks=request.tracks or [],
            frame_width=request.frame_width or 1920,
            frame_height=request.frame_height or 1080,
            brightness=request.brightness,
            persist_to_db=True
        )

        return AnalyzeEventsResponse(
            camera_id=request.camera_id,
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
async def configure_virtual_fence(config: VirtualFenceConfig):
    """
    Configures or updates a restricted spatial polygon zone for a specific camera.
    """
    try:
        virtual_fence_manager.set_camera_zone(config.camera_id, config.zone)
        return {
            "status": "SUCCESS",
            "camera_id": config.camera_id,
            "vertices_count": len(config.zone),
            "zone": config.zone,
            "message": f"Virtual fence polygon configured for camera {config.camera_id}."
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@router.get("/fence/{camera_id}", summary="Get configured virtual fence polygon for a camera")
async def get_virtual_fence(camera_id: str):
    """
    Retrieves the active virtual fence polygon vertices for a camera.
    """
    zone = virtual_fence_manager.get_camera_zone(camera_id)
    if zone is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No virtual fence configured for camera '{camera_id}'."
        )
    return {
        "camera_id": camera_id,
        "has_zone": True,
        "vertices_count": len(zone),
        "zone": zone
    }
