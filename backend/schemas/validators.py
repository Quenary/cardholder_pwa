import re

# Kept in step with backend.core.auth_core.BCRYPT_MAX_PASSWORD_BYTES, which
# is not imported here to keep the schemas free of the auth dependencies.
PASSWORD_MAX_BYTES = 72


def password_validator(value: str) -> str:
    """Validate password string"""
    # bcrypt ignores (4.x) or refuses with a ValueError (5.x) anything past 72
    # bytes. Refusing it here gives a 422 instead of a 500 at hashing time.
    if len(value.encode("utf-8")) > PASSWORD_MAX_BYTES:
        raise ValueError(
            f"The password must not be longer than {PASSWORD_MAX_BYTES} bytes."
        )
    if not re.search(r"[A-Z]", value):
        raise ValueError("The password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", value):
        raise ValueError("The password must contain at least one lowercase letter.")
    if not re.search(r"\d", value):
        raise ValueError("The password must contain at least one number.")
    return value
