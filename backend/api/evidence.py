from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional, Dict, Any
from services.supabase_service import supabase_service
from auth.dependencies import get_current_user, CurrentUser

router = APIRouter(prefix="/api/evidence", tags=["Evidence & Forensics"])


@router.get("/{event_id}", summary="Retrieve evidence access details and signed URL for a security incident")
async def get_incident_evidence(
    event_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Returns signed evidence URL and incident metadata for verified operators.
    Keeps Supabase service role keys and private storage credentials securely protected on the server.
    """
    evidence = supabase_service.get_evidence_by_event_id(event_id)
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence for event/alert '{event_id}' not found."
        )

    return evidence
