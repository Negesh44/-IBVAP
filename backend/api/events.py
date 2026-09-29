from fastapi import APIRouter, Query
from typing import List, Optional
from models.schemas import EventSchema
from services.supabase_service import supabase_service

router = APIRouter(prefix="/api/events", tags=["Events"])


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
