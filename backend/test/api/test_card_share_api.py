import pytest
from fastapi import HTTPException

from backend.api.card_share_api import (
    USERS_DEFAULT_LIMIT,
    delete_card_share,
    get_available_users,
    share_card,
)
from backend.db.models.card_share_model import CardShareModel
from backend.db.models.user_model import UserModel
from backend.schemas.card_share_schema import ShareCardRequestSchema
from backend.testing import mock_session


def _user() -> UserModel:
    return UserModel(id=1, username="alice")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("users", "total", "limit", "offset"),
    [
        ([UserModel(id=2, username="bob")], 1, None, None),
        ([], 120, 25, 100),
    ],
)
async def test_available_users_page(users, total, limit, offset) -> None:
    session = mock_session(all_=users, scalar=total)
    kwargs = {}
    if limit is not None:
        kwargs["limit"] = limit
    if offset is not None:
        kwargs["offset"] = offset

    page = await get_available_users(session=session, user=_user(), **kwargs)

    assert [item.id for item in page.items] == [user.id for user in users]
    assert page.total == total
    assert page.limit == (USERS_DEFAULT_LIMIT if limit is None else limit)
    assert page.offset == (0 if offset is None else offset)


@pytest.mark.asyncio
async def test_share_card_not_found() -> None:
    session = mock_session()
    req = ShareCardRequestSchema(card_id=99, user_ids=[2])

    with pytest.raises(HTTPException) as exc_info:
        await share_card(body=req, session=session, user=_user())

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "shares",
    [[CardShareModel(id=1, card_id=10, owner_id=1, shared_with_user_id=2)], []],
    ids=["found", "missing"],
)
async def test_delete_card_share(shares) -> None:
    session = mock_session(all_=shares)

    if not shares:
        with pytest.raises(HTTPException) as exc_info:
            await delete_card_share(card_id=999, session=session, user=_user())
        assert exc_info.value.status_code == 404
        return

    res = await delete_card_share(card_id=10, session=session, user=_user())

    assert res["detail"] == "Card shares deleted successfully"
    session.delete.assert_awaited_once_with(shares[0])
    session.commit.assert_awaited_once()
