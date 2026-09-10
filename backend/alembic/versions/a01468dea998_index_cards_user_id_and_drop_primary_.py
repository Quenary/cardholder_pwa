"""index cards user_id and drop primary key indexes

Revision ID: a01468dea998
Revises: 20206b671a3f
Create Date: 2026-09-09 12:38:42.710296

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a01468dea998"
down_revision: str | None = "20206b671a3f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index(op.f("ix_cards_user_id"), "cards", ["user_id"], unique=False)
    op.drop_index(op.f("ix_card_shares_id"), table_name="card_shares")
    op.drop_index(op.f("ix_cards_id"), table_name="cards")
    op.drop_index(
        op.f("ix_password_recovery_codes_id"), table_name="password_recovery_codes"
    )
    op.drop_index(op.f("ix_refresh_tokens_id"), table_name="refresh_tokens")
    op.drop_index(op.f("ix_users_id"), table_name="users")


def downgrade() -> None:
    """Downgrade schema."""
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_refresh_tokens_id"), "refresh_tokens", ["id"], unique=False)
    op.create_index(
        op.f("ix_password_recovery_codes_id"),
        "password_recovery_codes",
        ["id"],
        unique=False,
    )
    op.create_index(op.f("ix_cards_id"), "cards", ["id"], unique=False)
    op.create_index(op.f("ix_card_shares_id"), "card_shares", ["id"], unique=False)
    op.drop_index(op.f("ix_cards_user_id"), table_name="cards")
