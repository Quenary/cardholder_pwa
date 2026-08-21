"""card logo

Revision ID: b3f1c2d4e5a6
Revises: 62f72c3ab3a5
Create Date: 2026-08-19 15:40:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b3f1c2d4e5a6"
down_revision: str | None = "62f72c3ab3a5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add the logo file reference to cards.

    Only the file name is stored. The image itself lives on disk next to the
    database, so the database stays small and easy to dump/restore.
    """
    with op.batch_alter_table("cards", schema=None) as batch_op:
        batch_op.add_column(sa.Column("logo_file", sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("cards", schema=None) as batch_op:
        batch_op.drop_column("logo_file")
