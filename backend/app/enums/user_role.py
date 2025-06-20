from enum import Enum


class EUserRole(str, Enum):
    """Enum of user roles codes"""

    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"
