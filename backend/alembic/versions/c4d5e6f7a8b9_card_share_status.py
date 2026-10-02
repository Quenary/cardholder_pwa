"""card share status

Revision ID: c4d5e6f7a8b9
Revises: a01468dea998
Create Date: 2026-10-01 14:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c4d5e6f7a8b9"
down_revision: str | None = "a01468dea998"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Let the recipient accept or decline a share.

    Every share that exists is already live, so the rows are backfilled to
    accepted and nothing that works today stops working. The default is then
    dropped: a new share is created pending by the application, and a row
    written without a status should fail rather than silently be accepted.
    """
    with op.batch_alter_table("card_shares", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "status",
                sa.String(length=16),
                nullable=False,
                server_default="accepted",
            )
        )
        batch_op.add_column(sa.Column("responded_at", sa.DateTime(), nullable=True))
    with op.batch_alter_table("card_shares", schema=None) as batch_op:
        batch_op.alter_column(
            "status",
            existing_type=sa.String(length=16),
            existing_nullable=False,
            server_default=None,
        )


def downgrade() -> None:
    """Back to shares that are live as soon as they are made.

    Pending and declined shares are removed: leaving them would hand the
    recipient a card they never accepted.
    """
    op.execute("DELETE FROM card_shares WHERE status != 'accepted'")
    with op.batch_alter_table("card_shares", schema=None) as batch_op:
        batch_op.drop_column("responded_at")
        batch_op.drop_column("status")
