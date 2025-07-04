"""favorite and recent cards

Revision ID: 62f72c3ab3a5
Revises: 21459fe9053f
Create Date: 2025-07-04 00:20:18.908767

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "62f72c3ab3a5"
down_revision: Union[str, None] = "21459fe9053f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("cards", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_favorite",
                sa.Boolean(),
                server_default=sa.text("(FALSE)"),
                nullable=False,
            ),
        )
        batch_op.add_column(sa.Column("used_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("cards", schema=None) as batch_op:
        batch_op.drop_column("is_favorite")
        batch_op.drop_column("used_at")
