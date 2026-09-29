from fastapi import APIRouter, HTTPException, Query, Depends, status
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field

from services.supabase_service import supabase_service
from auth.dependencies import require_admin, require_commander, CurrentUser
from utils.security_validation import validate_role

router = APIRouter(prefix="/api/users", tags=["User & RBAC Administration"])


class RoleUpdateRequest(BaseModel):
    role: str = Field(..., description="ADMIN, COMMANDER, OPERATOR, VIEWER")


class CreateUserRequest(BaseModel):
    email: str = Field(..., description="User email address")
    name: str = Field(..., min_length=2, max_length=100)
    role: str = Field(..., description="ADMIN, COMMANDER, OPERATOR, VIEWER")
    department: Optional[str] = "Border Defense Unit"
    station: Optional[str] = "Command HQ"


@router.get("", summary="List users directory")
async def list_users(current_user: CurrentUser = Depends(require_commander)):
    """
    Lists users in the organization directory.
    Requires ADMIN or COMMANDER privileges (OPERATOR / VIEWER forbidden).
    """
    if supabase_service.is_connected and supabase_service.client:
        try:
            res = supabase_service.client.table("profiles").select("*").order("created_at", desc=True).execute()
            if res.data:
                return res.data
        except Exception as e:
            pass
    
    # In-memory mock directory
    return [
        {
            "id": "USR-001",
            "name": "Col. Sanjeev Rawat",
            "email": "sanjeev.rawat@ibvap.gov.in",
            "role": "ADMIN",
            "department": "Border Security Command HQ",
            "status": "ACTIVE"
        },
        {
            "id": "USR-002",
            "name": "Maj. Vikramaditya Singh",
            "email": "vikram.singh@ibvap.gov.in",
            "role": "COMMANDER",
            "department": "Sector Operations Wing",
            "status": "ACTIVE"
        },
        {
            "id": "USR-003",
            "name": "Inspector Priya Menon",
            "email": "priya.menon@ibvap.gov.in",
            "role": "OPERATOR",
            "department": "24x7 Tactical Surveillance Grid",
            "status": "ACTIVE"
        },
        {
            "id": "USR-004",
            "name": "Sub-Insp. Amit Deshmukh",
            "email": "amit.deshmukh@ibvap.gov.in",
            "role": "VIEWER",
            "department": "Perimeter Patrol Group",
            "status": "ACTIVE"
        }
    ]


@router.put("/{user_id}/role", summary="Update user role")
async def update_user_role(
    user_id: str,
    payload: RoleUpdateRequest,
    current_user: CurrentUser = Depends(require_admin)
):
    """
    Changes a user's RBAC role in the system.
    Strictly restricted to ADMIN role only.
    Normal users / Operators / Commanders are rejected with HTTP 403.
    """
    clean_role = validate_role(payload.role)

    if supabase_service.is_connected and supabase_service.client:
        try:
            supabase_service.client.table("profiles").update({"role": clean_role}).eq("id", user_id).execute()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to update role in Supabase: {e}")

    supabase_service.create_audit_log(
        action="ROLE_CHANGED",
        category="AUTH",
        record_id=user_id,
        details=f"User '{user_id}' role updated to {clean_role} by Admin {current_user.name}",
        user_name=current_user.name,
        user_role=current_user.role
    )

    return {
        "status": "SUCCESS",
        "user_id": user_id,
        "role": clean_role,
        "message": f"User '{user_id}' role updated to {clean_role}."
    }
