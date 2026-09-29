from enum import Enum
from typing import List, Set


class Role(str, Enum):
    ADMIN = "ADMIN"
    COMMANDER = "COMMANDER"
    OPERATOR = "OPERATOR"
    VIEWER = "VIEWER"


# Authorized capability mappings
OPERATIONAL_ROLES: Set[str] = {Role.ADMIN.value, Role.COMMANDER.value, Role.OPERATOR.value}
MANAGEMENT_ROLES: Set[str] = {Role.ADMIN.value, Role.COMMANDER.value}
ADMIN_ONLY: Set[str] = {Role.ADMIN.value}
ALL_ROLES: Set[str] = {Role.ADMIN.value, Role.COMMANDER.value, Role.OPERATOR.value, Role.VIEWER.value}


def is_role_authorized(user_role: str, allowed_roles: List[str]) -> bool:
    """
    Validates if user_role satisfies required role constraints.
    Case-insensitive matching for robust security.
    """
    if not user_role:
        return False
    normalized_user = user_role.strip().upper()
    normalized_allowed = {r.strip().upper() for r in allowed_roles}
    return normalized_user in normalized_allowed
