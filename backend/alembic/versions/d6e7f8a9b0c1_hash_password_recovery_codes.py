"""hash password recovery codes

Revision ID: d6e7f8a9b0c1
Revises: c4d5e6f7a8b9
Create Date: 2026-11-22 04:15:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d6e7f8a9b0c1"
down_revision: str | None = "c4d5e6f7a8b9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Store password recovery codes as a sha256 hex digest.

    Existing codes are plaintext and short-lived. They are deleted rather
    than hashed in place; anyone mid-reset requests a new link. The unique
    index stays on the column.
    """
    op.execute("DELETE FROM password_recovery_codes")
    with op.batch_alter_table("password_recovery_codes", schema=None) as batch_op:
        batch_op.alter_column(
            "code",
            existing_type=sa.String(),
            type_=sa.String(length=64),
            existing_nullable=False,
        )


def downgrade() -> None:
    """Back to a plaintext code column.

    Hashes cannot be turned back into codes, so the rows are deleted.
    SQLite and PostgreSQL go back to String() with no length, which is the
    column this revision started from. MySQL cannot render that: VARCHAR
    needs a length, and a unique index cannot cover TEXT. VARCHAR(255) is
    the type that still holds the old plaintext codes and keeps the index.
    """
    op.execute("DELETE FROM password_recovery_codes")
    restored = (
        sa.String(length=255) if op.get_bind().dialect.name == "mysql" else sa.String()
    )
    with op.batch_alter_table("password_recovery_codes", schema=None) as batch_op:
        batch_op.alter_column(
            "code",
            existing_type=sa.String(length=64),
            type_=restored,
            existing_nullable=False,
        )
