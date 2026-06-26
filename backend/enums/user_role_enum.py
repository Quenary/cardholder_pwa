from enum import StrEnum


class EUserRole(StrEnum):
    """Enum of user roles codes"""

    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"
