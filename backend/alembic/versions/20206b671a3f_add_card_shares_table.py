"""add card_shares table

Revision ID: 20206b671a3f
Revises: b3f1c2d4e5a6
Create Date: 2026-09-03 01:12:35.884999

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20206b671a3f"
down_revision: str | None = "b3f1c2d4e5a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "card_shares",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("card_id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("shared_with_user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["card_id"], ["cards.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["shared_with_user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "card_id", "shared_with_user_id", name="uq_card_shares_card_user"
        ),
    )
    with op.batch_alter_table("card_shares", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_card_shares_card_id"), ["card_id"], unique=False
        )
        batch_op.create_index(batch_op.f("ix_card_shares_id"), ["id"], unique=False)
        batch_op.create_index(
            batch_op.f("ix_card_shares_owner_id"), ["owner_id"], unique=False
        )
        batch_op.create_index(
            batch_op.f("ix_card_shares_shared_with_user_id"),
            ["shared_with_user_id"],
            unique=False,
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("card_shares", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_card_shares_shared_with_user_id"))
        batch_op.drop_index(batch_op.f("ix_card_shares_owner_id"))
        batch_op.drop_index(batch_op.f("ix_card_shares_id"))
        batch_op.drop_index(batch_op.f("ix_card_shares_card_id"))

    op.drop_table("card_shares")
