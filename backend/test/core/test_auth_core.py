import bcrypt
import pytest
from pydantic import ValidationError

from backend.core.auth_core import get_password_hash, verify_password
from backend.schemas.password_recovery_schema import PasswordRecoverySubmitSchema
from backend.schemas.user_schema import UserCreateSchema

LONG_PASSWORD = "Aa1" + "x" * 97  # 100 bytes, past bcrypt's 72


def test_verify_password_does_not_raise_on_a_long_password() -> None:
    # bcrypt 5 raises ValueError past 72 bytes, which turned a login attempt
    # into a 500 instead of a plain wrong-password answer.
    hashed = get_password_hash("123456qQ")

    assert verify_password(LONG_PASSWORD, hashed) is False


def test_verify_password_accepts_a_hash_made_from_a_truncated_password() -> None:
    # What bcrypt < 5 stored for a long password: a hash of its first 72
    # bytes. Those accounts must still be able to log in.
    legacy_hash = bcrypt.hashpw(
        LONG_PASSWORD.encode("utf-8")[:72], bcrypt.gensalt()
    ).decode("utf-8")

    assert verify_password(LONG_PASSWORD, legacy_hash) is True


def test_password_validator_refuses_more_than_72_bytes() -> None:
    with pytest.raises(ValidationError):
        UserCreateSchema(
            username="user_name",
            email="user@example.com",
            password=LONG_PASSWORD,
            confirm_password=LONG_PASSWORD,
        )
    with pytest.raises(ValidationError):
        PasswordRecoverySubmitSchema(
            code="c", password=LONG_PASSWORD, confirm_password=LONG_PASSWORD
        )


def test_password_validator_counts_bytes_not_characters() -> None:
    # 28 characters, but 78 bytes in UTF-8.
    password = "Aa1" + "€" * 25
    assert len(password) == 28
    assert len(password.encode("utf-8")) > 72

    with pytest.raises(ValidationError):
        UserCreateSchema(
            username="user_name",
            email="user@example.com",
            password=password,
            confirm_password=password,
        )


def test_password_validator_accepts_exactly_72_bytes() -> None:
    password = "Aa1" + "x" * 69
    schema = UserCreateSchema(
        username="user_name",
        email="user@example.com",
        password=password,
        confirm_password=password,
    )

    assert verify_password(password, get_password_hash(schema.password))


@pytest.mark.parametrize("password", ["Aa1", "Aa1xxxx"])
def test_password_validator_refuses_fewer_than_8_characters(password: str) -> None:
    # The frontend asked for 8 characters, but the API took anything that had
    # an upper case letter, a lower case letter and a digit.
    with pytest.raises(ValidationError):
        UserCreateSchema(
            username="user_name",
            email="user@example.com",
            password=password,
            confirm_password=password,
        )


def test_password_validator_accepts_8_characters() -> None:
    schema = PasswordRecoverySubmitSchema(
        code="c", password="Aa1xxxxx", confirm_password="Aa1xxxxx"
    )

    assert schema.password == "Aa1xxxxx"
