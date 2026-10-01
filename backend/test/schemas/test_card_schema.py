import pytest
from pydantic import ValidationError

from backend.schemas.card_schema import (
    CODE_MAX_LENGTH,
    DESCRIPTION_MAX_LENGTH,
    NAME_MAX_LENGTH,
    CardCreateSchema,
    CardPatchSchema,
    CardUpdateSchema,
)


def _payload(**overrides) -> dict:
    payload = {"code": "0123456789012", "code_type": "ean13", "name": "Shop"}
    payload.update(overrides)
    return payload


def test_card_accepts_a_normal_payload() -> None:
    card = CardCreateSchema(**_payload(description="a note"))

    assert card.name == "Shop"
    assert card.description == "a note"


def test_card_accepts_a_code_at_the_limit() -> None:
    card = CardCreateSchema(**_payload(code="0" * CODE_MAX_LENGTH))

    assert len(card.code) == CODE_MAX_LENGTH


@pytest.mark.parametrize(
    "field,length",
    [
        ("code", CODE_MAX_LENGTH),
        ("name", NAME_MAX_LENGTH),
        ("description", DESCRIPTION_MAX_LENGTH),
    ],
)
def test_card_rejects_an_oversized_field(field: str, length: int) -> None:
    with pytest.raises(ValidationError):
        CardCreateSchema(**_payload(**{field: "x" * (length + 1)}))


def test_patch_rejects_an_oversized_field() -> None:
    with pytest.raises(ValidationError):
        CardPatchSchema(name="x" * (NAME_MAX_LENGTH + 1))


def test_patch_still_accepts_an_empty_payload() -> None:
    assert CardPatchSchema().model_dump(exclude_unset=True) == {}


@pytest.mark.parametrize("field", ["code", "code_type", "name", "is_favorite"])
def test_patch_rejects_null_for_a_required_column(field: str) -> None:
    # These columns are NOT NULL: a null used to get through to the database
    # and come back as a 500.
    with pytest.raises(ValidationError):
        CardPatchSchema(**{field: None})


@pytest.mark.parametrize("field", ["description", "color", "used_at"])
def test_patch_still_accepts_null_for_a_nullable_column(field: str) -> None:
    assert CardPatchSchema(**{field: None}).model_dump(exclude_unset=True) == {
        field: None
    }


def test_update_rejects_a_null_favorite_flag() -> None:
    with pytest.raises(ValidationError):
        CardUpdateSchema(**_payload(is_favorite=None))


def test_update_and_create_still_accept_a_missing_favorite_flag() -> None:
    assert CardUpdateSchema(**_payload()).is_favorite is None
    assert CardCreateSchema(**_payload(is_favorite=None)).is_favorite is None
