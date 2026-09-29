from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from models.schemas import AlertSchema, AlertActionRequest
from services.supabase_service import supabase_service

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertSchema], summary="List perimeter alerts")
async def list_alerts(
    limit: int = Query(50, ge=1, le=100, description="Max alerts to return"),
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE, ACKNOWLEDGED, RESOLVED")
):
    """
    Retrieves prioritized alerts from the database.
    """
    alerts = supabase_service.get_alerts(limit=limit, status=status)
    return alerts


@router.post("/{alert_id}/action", response_model=AlertSchema, summary="Update alert status")
async def update_alert(alert_id: str, payload: AlertActionRequest):
    """
    Acknowledge or resolve an active perimeter alarm.
    Logs audit events in Supabase audit_logs table.
    """
    updated = supabase_service.update_alert_status(alert_id, payload.status, payload.note)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Alert with ID '{alert_id}' not found.")

    action_name = f"ALERT_{payload.status.upper()}"
    supabase_service.create_audit_log(
        action=action_name,
        category="ALERT",
        record_id=alert_id,
        details=f"Alert status set to {payload.status.upper()}: {payload.note or 'No operator notes provided'}",
        user_name=payload.operator_name or "Command Operator",
        user_role="OPERATOR"
    )

    return updated
