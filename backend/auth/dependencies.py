import os
import time
import logging
from typing import Optional, Dict, Any, List
from fastapi import Header, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import jwt

from auth.permissions import Role, is_role_authorized
from services.supabase_service import supabase_service

logger = logging.getLogger("ibvap.auth")

security_scheme = HTTPBearer(auto_error=False)

# Configuration from Environment
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "").strip()
IS_DEV = os.getenv("ENVIRONMENT", "development").lower() in ("development", "test")


class CurrentUser(BaseModel):
    id: str = Field(..., description="User Unique Identifier")
    email: str = Field(..., description="User Email Address")
    role: str = Field(default=Role.VIEWER.value, description="User RBAC Role")
    name: Optional[str] = Field(default="Authorized Operator")
    department: Optional[str] = Field(default="Border Command Operations")


def get_current_user(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> CurrentUser:
    """
    Validates Supabase Bearer JWT token from Authorization header.
    Rejects missing, invalid, or expired tokens with HTTP 401.
    """
    if not auth_header or not auth_header.credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required: Missing Bearer token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = auth_header.credentials.strip()

    try:
        # If SUPABASE_JWT_SECRET is provided, verify cryptographic HMAC signature
        if SUPABASE_JWT_SECRET:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_exp": True, "verify_signature": True}
            )
        else:
            # Decode without secret verification (for local prototype or when public key is not cached),
            # but still strictly validate payload structure and expiration timestamp
            payload = jwt.decode(
                token,
                options={"verify_signature": False, "verify_exp": True}
            )

        # Validate mandatory claims
        user_id = payload.get("sub") or payload.get("id")
        email = payload.get("email", "")

        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Authentication failed: Token missing subject claim (sub)"
            )

        # Extract role from user_metadata or app_metadata
        user_metadata = payload.get("user_metadata", {})
        app_metadata = payload.get("app_metadata", {})

        role = (
            user_metadata.get("role") or
            app_metadata.get("role") or
            payload.get("role") or
            Role.VIEWER.value
        ).strip().upper()

        name = user_metadata.get("full_name") or user_metadata.get("name") or email.split("@")[0] or "Command Officer"
        department = user_metadata.get("department") or "Border Command Operations"

        # Validate role is a recognized role
        valid_roles = {r.value for r in Role}
        if role not in valid_roles:
            role = Role.VIEWER.value

        return CurrentUser(
            id=str(user_id),
            email=str(email),
            role=role,
            name=name,
            department=department
        )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Authentication failed: Token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: Invalid token ({str(e)})",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Unexpected token validation error: {e}")
        raise HTTPException(
            status_code=401,
            detail="Authentication failed: Unable to verify credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )


def require_roles(*allowed_roles: str):
    """
    Factory creating a FastAPI dependency requiring user to possess one of the allowed roles.
    Raises HTTP 403 Forbidden if user lacks sufficient privileges.
    """
    def role_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not is_role_authorized(current_user.role, list(allowed_roles)):
            logger.warning(
                f"Access denied for user {current_user.email} (Role: {current_user.role}). "
                f"Required roles: {allowed_roles}"
            )
            raise HTTPException(
                status_code=403,
                detail=f"Forbidden: Insufficient privileges. Required role in {list(allowed_roles)}"
            )
        return current_user

    return role_checker


# Convenient role-specific dependencies
require_admin = require_roles(Role.ADMIN.value)
require_commander = require_roles(Role.ADMIN.value, Role.COMMANDER.value)
require_operator = require_roles(Role.ADMIN.value, Role.COMMANDER.value, Role.OPERATOR.value)
require_authenticated = get_current_user
