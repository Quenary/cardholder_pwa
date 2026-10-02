import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from backend.core.auth_core import is_user
from backend.db.models.card_model import CardModel
from backend.db.models.card_share_model import CardShareModel
from backend.db.models.user_model import UserModel
from backend.db.session import get_async_session
from backend.enums.card_share_status_enum import ECardShareStatus
from backend.helpers.now import now
from backend.schemas.card_schema import CardSchema
from backend.schemas.card_share_schema import (
    ShareAllCardsRequestSchema,
    ShareCardRequestSchema,
    SharedCardItemSchema,
    SharedCardsResponseSchema,
    SharedWithMeCountSchema,
    SharedWithMeItemSchema,
    ShareRecipientSchema,
    ShareUserSchema,
    ShareUsersPageSchema,
    UpdateCardShareRequestSchema,
)

router = APIRouter(prefix="/cards/share", tags=["card-share"])
logger = logging.getLogger(__name__)

# The directory grows with the number of accounts, and the whole of it used to
# come back in one response. These bound a page; the caller walks the rest.
USERS_DEFAULT_LIMIT = 50
USERS_MAX_LIMIT = 200


async def _get_cards_shared_by_user(
    session: AsyncSession, user_id: int
) -> list[SharedCardItemSchema]:
    stmt = (
        select(CardShareModel)
        .options(
            joinedload(CardShareModel.card),
            joinedload(CardShareModel.shared_with_user),
        )
        .where(CardShareModel.owner_id == user_id)
        .order_by(CardShareModel.created_at.desc())
    )
    res = await session.execute(stmt)
    shares = res.scalars().all()

    cards_map: dict[int, dict] = {}
    for share in shares:
        if not share.card:
            continue
        if share.card_id not in cards_map:
            cards_map[share.card_id] = {
                "card": share.card,
                "shared_with_users": [],
            }
        if share.shared_with_user:
            cards_map[share.card_id]["shared_with_users"].append(
                ShareRecipientSchema(
                    id=share.shared_with_user.id,
                    username=share.shared_with_user.username,
                    status=share.status,
                )
            )

    return [
        SharedCardItemSchema(
            card=CardSchema.model_validate(item["card"]),
            shared_with_users=item["shared_with_users"],
        )
        for item in cards_map.values()
    ]


async def _get_cards_shared_with_user(
    session: AsyncSession,
    user_id: int,
    status: ECardShareStatus = ECardShareStatus.ACCEPTED,
) -> list[SharedWithMeItemSchema]:
    """The shares the caller received, in one state of their decision.

    Accepted by default, which is what belongs in the caller's card list.
    This only picks what is listed: read access to a shared card is decided
    by the card endpoints, and holds in every state.
    """
    stmt = (
        select(CardShareModel)
        .options(
            joinedload(CardShareModel.card),
            joinedload(CardShareModel.owner),
        )
        .where(
            CardShareModel.shared_with_user_id == user_id,
            CardShareModel.status == status,
        )
        .order_by(CardShareModel.created_at.desc())
    )
    result = await session.execute(stmt)
    shares = result.scalars().all()
    return [
        SharedWithMeItemSchema(
            card=CardSchema.model_validate(s.card),
            owner=ShareUserSchema(id=s.owner.id, username=s.owner.username),
            status=s.status,
        )
        for s in shares
        if s.card and s.owner
    ]


async def _count_cards_shared_with_user(
    session: AsyncSession,
    user_id: int,
    status: ECardShareStatus = ECardShareStatus.ACCEPTED,
) -> int:
    """How many rows _get_cards_shared_with_user would return, without the join."""
    total = await session.scalar(
        select(func.count())
        .select_from(CardShareModel)
        .where(
            CardShareModel.shared_with_user_id == user_id,
            CardShareModel.status == status,
        )
    )
    return total or 0


async def _sync_shares(
    session: AsyncSession,
    owner_id: int,
    card_ids: list[int],
    user_ids: list[int],
) -> None:
    """Make the recipients of the given cards exactly `user_ids`, as a diff.

    Rows for users that stay are kept as they are, so a recipient's decision
    survives the owner editing the list. Rows for users that are no longer
    listed are deleted, and a new recipient starts as pending. A declined
    share is left declined rather than asked again.
    """
    if not card_ids:
        return
    existing_res = await session.execute(
        select(CardShareModel).where(
            CardShareModel.owner_id == owner_id,
            CardShareModel.card_id.in_(card_ids),
        )
    )
    existing = {
        (share.card_id, share.shared_with_user_id)
        for share in existing_res.scalars().all()
    }
    wanted = {(card_id, user_id) for card_id in card_ids for user_id in user_ids}

    removal = delete(CardShareModel).where(
        CardShareModel.owner_id == owner_id,
        CardShareModel.card_id.in_(card_ids),
    )
    if user_ids:
        removal = removal.where(CardShareModel.shared_with_user_id.not_in(user_ids))
    await session.execute(removal)
    for card_id, user_id in sorted(wanted - existing):
        session.add(
            CardShareModel(
                card_id=card_id,
                owner_id=owner_id,
                shared_with_user_id=user_id,
                status=ECardShareStatus.PENDING,
            )
        )


async def _replace_shares(
    card_id: int,
    user_ids: list[int],
    session: AsyncSession,
    user: UserModel,
) -> SharedCardItemSchema:
    """Set the exact list of users a card of the caller is shared with.

    The given list becomes the whole truth, but as a diff: see _sync_shares.
    Ids that match no account, and the caller's own, are ignored rather than
    refused.
    """
    stmt = (
        select(CardModel)
        .where(CardModel.id == card_id, CardModel.user_id == user.id)
        .limit(1)
    )
    result = await session.execute(stmt)
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    target_user_ids = [uid for uid in set(user_ids) if uid != user.id]
    valid_users: list[UserModel] = []
    if target_user_ids:
        users_res = await session.execute(
            select(UserModel).where(UserModel.id.in_(target_user_ids))
        )
        valid_users = list(users_res.scalars().all())

    await _sync_shares(session, user.id, [card.id], [u.id for u in valid_users])
    await session.commit()

    shares_res = await session.execute(
        select(CardShareModel).where(
            CardShareModel.owner_id == user.id, CardShareModel.card_id == card.id
        )
    )
    status_by_user = {
        share.shared_with_user_id: share.status for share in shares_res.scalars().all()
    }
    await session.refresh(card)
    return SharedCardItemSchema(
        card=CardSchema.model_validate(card),
        shared_with_users=[
            ShareRecipientSchema(
                id=u.id, username=u.username, status=status_by_user[u.id]
            )
            for u in valid_users
        ],
    )


@router.get("", response_model=SharedCardsResponseSchema)
async def get_shared_cards(
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Retrieve cards shared by the caller and cards shared with the caller."""
    you_share = await _get_cards_shared_by_user(session, user.id)
    shared_with_you = await _get_cards_shared_with_user(session, user.id)
    return SharedCardsResponseSchema(
        you_share=you_share,
        shared_with_you=shared_with_you,
    )


@router.get("/users", response_model=ShareUsersPageSchema)
async def get_available_users(
    limit: Annotated[int, Query(ge=1, le=USERS_MAX_LIMIT)] = USERS_DEFAULT_LIMIT,
    offset: Annotated[int, Query(ge=0)] = 0,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Retrieve one page of the other users a card can be shared with."""
    total = await session.scalar(
        select(func.count()).select_from(UserModel).where(UserModel.id != user.id)
    )
    stmt = (
        select(UserModel)
        .where(UserModel.id != user.id)
        .order_by(UserModel.username.asc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    users = result.scalars().all()
    return ShareUsersPageSchema(
        items=[ShareUserSchema(id=u.id, username=u.username) for u in users],
        total=total or 0,
        limit=limit,
        offset=offset,
    )


@router.get("/with-me", response_model=list[SharedWithMeItemSchema])
async def get_cards_shared_with_me(
    status: ECardShareStatus = ECardShareStatus.ACCEPTED,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Retrieve the cards shared with the caller (for the main cards view).

    Only the accepted ones unless another `status` is asked for: pending to
    decide on, declined to look at again.
    """
    return await _get_cards_shared_with_user(session, user.id, status)


@router.get("/with-me/count", response_model=SharedWithMeCountSchema)
async def get_cards_shared_with_me_count(
    status: ECardShareStatus = ECardShareStatus.ACCEPTED,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """How many cards are shared with the caller in this status, for a badge."""
    count = await _count_cards_shared_with_user(session, user.id, status)
    return SharedWithMeCountSchema(count=count)


@router.post("", response_model=SharedCardItemSchema, status_code=201)
async def share_card(
    body: ShareCardRequestSchema,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Share a single card with selected users (replaces previous shares for this card)."""
    return await _replace_shares(body.card_id, body.user_ids, session, user)


@router.put("/{card_id}", response_model=SharedCardItemSchema)
async def update_card_share(
    card_id: int,
    body: UpdateCardShareRequestSchema,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Update user shares for a specific card."""
    return await _replace_shares(card_id, body.user_ids, session, user)


@router.post("/all")
async def share_all_cards(
    body: ShareAllCardsRequestSchema,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Share all user cards with selected users (replaces existing shares, keeping the recipients' decisions)."""
    target_user_ids = [uid for uid in set(body.user_ids) if uid != user.id]
    valid_uids: list[int] = []
    if target_user_ids:
        users_res = await session.execute(
            select(UserModel.id).where(UserModel.id.in_(target_user_ids))
        )
        valid_uids = list(users_res.scalars().all())

    cards_res = await session.execute(
        select(CardModel.id).where(CardModel.user_id == user.id)
    )
    card_ids = list(cards_res.scalars().all())

    await _sync_shares(session, user.id, card_ids, valid_uids)
    await session.commit()
    return {"detail": "All cards shared successfully"}


async def _get_share_with_me(
    session: AsyncSession, card_id: int, user: UserModel
) -> CardShareModel:
    result = await session.execute(
        select(CardShareModel)
        .where(
            CardShareModel.card_id == card_id,
            CardShareModel.shared_with_user_id == user.id,
        )
        .limit(1)
    )
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Card share not found")
    return share


async def _respond(
    session: AsyncSession,
    card_id: int,
    user: UserModel,
    status: ECardShareStatus,
) -> CardShareModel:
    share = await _get_share_with_me(session, card_id, user)
    share.status = status
    share.responded_at = now()
    await session.commit()
    return share


@router.post("/with-me/{card_id}/accept")
async def accept_card_shared_with_me(
    card_id: int,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Accept a card shared with the caller: it joins their cards.

    Works from a pending share, and from a declined one the caller changed
    their mind about.
    """
    await _respond(session, card_id, user, ECardShareStatus.ACCEPTED)
    return {"detail": "Shared card accepted"}


@router.post("/with-me/{card_id}/decline")
async def decline_card_shared_with_me(
    card_id: int,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Decline a card shared with the caller: it stays out of their cards."""
    await _respond(session, card_id, user, ECardShareStatus.DECLINED)
    return {"detail": "Shared card declined"}


@router.delete("/with-me/{card_id}")
async def delete_card_shared_with_me(
    card_id: int,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Remove a card share for the current user (stop receiving this shared card).

    The share is declined rather than deleted. A deleted row would let the
    owner share the card again straight away, and the removal would not hold.
    """
    await _respond(session, card_id, user, ECardShareStatus.DECLINED)
    return {"detail": "Shared card removed successfully"}


@router.delete("/{card_id}")
async def delete_card_share(
    card_id: int,
    session: AsyncSession = Depends(get_async_session),
    user: UserModel = Depends(is_user),
):
    """Delete all shares for a specific card owned by the caller."""
    stmt = select(CardShareModel).where(
        CardShareModel.card_id == card_id,
        CardShareModel.owner_id == user.id,
    )
    result = await session.execute(stmt)
    shares = result.scalars().all()
    if not shares:
        raise HTTPException(status_code=404, detail="Card share not found")
    for share in shares:
        await session.delete(share)
    await session.commit()
    return {"detail": "Card shares deleted successfully"}
