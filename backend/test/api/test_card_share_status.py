"""Accepting and declining a share, against a real database."""

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import select

from backend.api.card_api import _get_accessible_card
from backend.api.card_share_api import (
    accept_card_shared_with_me,
    decline_card_shared_with_me,
    delete_card_shared_with_me,
    get_cards_shared_with_me,
    get_cards_shared_with_me_count,
    get_shared_cards,
    share_all_cards,
    share_card,
    update_card_share,
)
from backend.db.models import CardModel, CardShareModel, UserModel
from backend.enums.card_share_status_enum import ECardShareStatus
from backend.schemas.card_share_schema import (
    ShareAllCardsRequestSchema,
    ShareCardRequestSchema,
    UpdateCardShareRequestSchema,
)
from backend.testing import sqlite_db

PENDING = ECardShareStatus.PENDING
ACCEPTED = ECardShareStatus.ACCEPTED
DECLINED = ECardShareStatus.DECLINED


@pytest_asyncio.fixture
async def db(tmp_path):
    async with sqlite_db(tmp_path / "test.db") as maker:
        async with maker() as session:
            for name in ("alice", "bob", "carol"):
                session.add(
                    UserModel(
                        username=name,
                        email=f"{name}@example.com",
                        hashed_password="x",
                    )
                )
            await session.commit()
            for code in ("1", "2"):
                session.add(
                    CardModel(
                        user_id=1, name=f"card {code}", code=code, code_type="ean13"
                    )
                )
            await session.commit()
            yield session


async def _user(db, user_id: int) -> UserModel:
    return (
        await db.execute(select(UserModel).where(UserModel.id == user_id))
    ).scalar_one()


async def _statuses(db, card_id: int) -> dict[int, ECardShareStatus]:
    rows = await db.execute(
        select(CardShareModel).where(CardShareModel.card_id == card_id)
    )
    return {s.shared_with_user_id: s.status for s in rows.scalars().all()}


ALICE, BOB, CAROL = 1, 2, 3


@pytest.mark.asyncio
async def test_a_new_share_waits_for_the_recipient(db) -> None:
    alice = await _user(db, ALICE)

    shared = await share_card(
        ShareCardRequestSchema(card_id=1, user_ids=[BOB]), db, alice
    )

    assert [(u.id, u.status) for u in shared.shared_with_users] == [(BOB, PENDING)]
    bob = await _user(db, BOB)
    assert await get_cards_shared_with_me(ECardShareStatus.ACCEPTED, db, bob) == []
    pending = await get_cards_shared_with_me(PENDING, db, bob)
    assert [(i.card.id, i.owner.username, i.status) for i in pending] == [
        (1, "alice", PENDING)
    ]
    assert (await get_cards_shared_with_me_count(PENDING, db, bob)).count == 1
    assert (await get_cards_shared_with_me_count(ACCEPTED, db, bob)).count == 0


@pytest.mark.asyncio
async def test_accepting_puts_the_card_in_the_list(db) -> None:
    await share_card(
        ShareCardRequestSchema(card_id=1, user_ids=[BOB]), db, await _user(db, ALICE)
    )
    bob = await _user(db, BOB)

    await accept_card_shared_with_me(1, db, bob)

    accepted = await get_cards_shared_with_me(ACCEPTED, db, bob)
    assert [i.card.id for i in accepted] == [1]
    assert await get_cards_shared_with_me(PENDING, db, bob) == []
    row = (await db.execute(select(CardShareModel))).scalar_one()
    assert row.responded_at is not None


@pytest.mark.asyncio
async def test_declining_keeps_the_card_out_but_on_record(db) -> None:
    await share_card(
        ShareCardRequestSchema(card_id=1, user_ids=[BOB]), db, await _user(db, ALICE)
    )
    bob = await _user(db, BOB)

    await decline_card_shared_with_me(1, db, bob)

    assert await get_cards_shared_with_me(ACCEPTED, db, bob) == []
    declined = await get_cards_shared_with_me(DECLINED, db, bob)
    assert [i.card.id for i in declined] == [1]


@pytest.mark.asyncio
async def test_a_declined_share_can_be_accepted_later(db) -> None:
    await share_card(
        ShareCardRequestSchema(card_id=1, user_ids=[BOB]), db, await _user(db, ALICE)
    )
    bob = await _user(db, BOB)
    await decline_card_shared_with_me(1, db, bob)

    await accept_card_shared_with_me(1, db, bob)

    assert (await _statuses(db, 1))[BOB] == ACCEPTED


@pytest.mark.asyncio
async def test_removing_a_shared_card_declines_it_instead_of_deleting_the_row(
    db,
) -> None:
    alice = await _user(db, ALICE)
    bob = await _user(db, BOB)
    await share_card(ShareCardRequestSchema(card_id=1, user_ids=[BOB]), db, alice)
    await accept_card_shared_with_me(1, db, bob)

    await delete_card_shared_with_me(1, db, bob)
    # The owner shares it again, as they did the first time.
    await update_card_share(1, UpdateCardShareRequestSchema(user_ids=[BOB]), db, alice)

    assert (await _statuses(db, 1)) == {BOB: DECLINED}
    assert await get_cards_shared_with_me(ACCEPTED, db, bob) == []


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "respond",
    [
        accept_card_shared_with_me,
        decline_card_shared_with_me,
        delete_card_shared_with_me,
    ],
)
async def test_one_cannot_answer_a_share_made_to_someone_else(db, respond) -> None:
    await share_card(
        ShareCardRequestSchema(card_id=1, user_ids=[BOB]), db, await _user(db, ALICE)
    )

    with pytest.raises(HTTPException) as exc_info:
        await respond(1, db, await _user(db, CAROL))

    assert exc_info.value.status_code == 404
    assert (await _statuses(db, 1)) == {BOB: PENDING}


@pytest.mark.asyncio
async def test_editing_the_recipients_keeps_the_decisions(db) -> None:
    alice = await _user(db, ALICE)
    await share_card(
        ShareCardRequestSchema(card_id=1, user_ids=[BOB, CAROL]), db, alice
    )
    await accept_card_shared_with_me(1, db, await _user(db, BOB))
    await decline_card_shared_with_me(1, db, await _user(db, CAROL))
    # alice also shares with herself by mistake, which is ignored

    shared = await update_card_share(
        1, UpdateCardShareRequestSchema(user_ids=[BOB, CAROL, ALICE]), db, alice
    )

    assert (await _statuses(db, 1)) == {BOB: ACCEPTED, CAROL: DECLINED}
    assert {(u.id, u.status) for u in shared.shared_with_users} == {
        (BOB, ACCEPTED),
        (CAROL, DECLINED),
    }


@pytest.mark.asyncio
async def test_editing_the_recipients_drops_the_removed_and_adds_pending(db) -> None:
    alice = await _user(db, ALICE)
    await share_card(ShareCardRequestSchema(card_id=1, user_ids=[BOB]), db, alice)
    await accept_card_shared_with_me(1, db, await _user(db, BOB))

    await update_card_share(
        1, UpdateCardShareRequestSchema(user_ids=[CAROL]), db, alice
    )

    assert (await _statuses(db, 1)) == {CAROL: PENDING}


@pytest.mark.asyncio
async def test_clearing_the_recipients_removes_every_share(db) -> None:
    alice = await _user(db, ALICE)
    await share_card(
        ShareCardRequestSchema(card_id=1, user_ids=[BOB, CAROL]), db, alice
    )

    await update_card_share(1, UpdateCardShareRequestSchema(user_ids=[]), db, alice)

    assert (await _statuses(db, 1)) == {}


@pytest.mark.asyncio
async def test_sharing_everything_keeps_the_decisions_too(db) -> None:
    alice = await _user(db, ALICE)
    await share_card(ShareCardRequestSchema(card_id=1, user_ids=[BOB]), db, alice)
    await decline_card_shared_with_me(1, db, await _user(db, BOB))

    await share_all_cards(ShareAllCardsRequestSchema(user_ids=[BOB]), db, alice)

    assert (await _statuses(db, 1)) == {BOB: DECLINED}
    assert (await _statuses(db, 2)) == {BOB: PENDING}


@pytest.mark.asyncio
async def test_sharing_everything_removes_the_users_no_longer_listed(db) -> None:
    alice = await _user(db, ALICE)
    await share_all_cards(ShareAllCardsRequestSchema(user_ids=[BOB, CAROL]), db, alice)

    await share_all_cards(ShareAllCardsRequestSchema(user_ids=[CAROL]), db, alice)

    assert (await _statuses(db, 1)) == {CAROL: PENDING}
    assert (await _statuses(db, 2)) == {CAROL: PENDING}


@pytest.mark.asyncio
async def test_the_owner_sees_what_each_recipient_decided(db) -> None:
    alice = await _user(db, ALICE)
    await share_card(
        ShareCardRequestSchema(card_id=1, user_ids=[BOB, CAROL]), db, alice
    )
    await accept_card_shared_with_me(1, db, await _user(db, BOB))

    overview = await get_shared_cards(db, alice)

    recipients = {u.username: u.status for u in overview.you_share[0].shared_with_users}
    assert recipients == {"bob": ACCEPTED, "carol": PENDING}
    assert overview.shared_with_you == []


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "decision", [None, accept_card_shared_with_me, decline_card_shared_with_me]
)
async def test_the_recipient_can_read_the_card_whatever_they_decided(
    db, decision
) -> None:
    """The recipient has to see a pending card to decide on it, and a declined
    one to change their mind, so the read guard does not look at the status."""
    await share_card(
        ShareCardRequestSchema(card_id=1, user_ids=[BOB]), db, await _user(db, ALICE)
    )
    bob = await _user(db, BOB)
    if decision:
        await decision(1, db, bob)

    card = await _get_accessible_card(1, db, bob)

    assert card.id == 1


@pytest.mark.asyncio
async def test_someone_without_a_share_still_cannot_read_the_card(db) -> None:
    await share_card(
        ShareCardRequestSchema(card_id=1, user_ids=[BOB]), db, await _user(db, ALICE)
    )

    with pytest.raises(HTTPException) as exc_info:
        await _get_accessible_card(1, db, await _user(db, CAROL))

    assert exc_info.value.status_code == 404
