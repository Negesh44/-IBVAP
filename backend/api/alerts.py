from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from models.schemas import AlertSchema, AlertActionRequest
from services.supabase_service import supabase_service
from auth.dependencies import get_current_user, require_operator, CurrentUser

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertSchema], summary="List perimeter alerts")
async def list_alerts(
    limit: int = Query(50, ge=1, le=100, description="Max alerts to return"),
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE, ACKNOWLEDGED, RESOLVED"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Retrieves prioritized alerts from the database for authenticated users.
    """
    alerts = supabase_service.get_alerts(limit=limit, status=status)
    return alerts


@router.post("/{alert_id}/action", response_model=AlertSchema, summary="Update alert status")
async def update_alert(
    alert_id: str,
    payload: AlertActionRequest,
    current_user: CurrentUser = Depends(require_operator)
):
    """
    Acknowledge or resolve an active perimeter alarm.
    Requires ADMIN, COMMANDER, or OPERATOR privileges (VIEWER forbidden).
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
        user_name=current_user.name or payload.operator_name or "Command Operator",
        user_role=current_user.role
    )

    return updated
