"""two-factor authentication

Revision ID: e7f8a9b0c1d2
Revises: d6e7f8a9b0c1
Create Date: 2026-11-22 05:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e7f8a9b0c1d2"
down_revision: str | None = "d6e7f8a9b0c1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Store encrypted TOTP secrets and one-time recovery-code hashes.

    Every new column is nullable or defaulted, so rows that already exist
    stay valid and two-factor authentication stays off until a user enables
    it. String columns carry an explicit length because MySQL rejects a
    VARCHAR without one.
    """
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("two_factor_secret", sa.String(length=255), nullable=True)
        )
        batch_op.add_column(
            sa.Column("two_factor_enabled_at", sa.DateTime(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("two_factor_last_step", sa.Integer(), nullable=True)
        )
        batch_op.add_column(
            sa.Column(
                "two_factor_failed_attempts",
                sa.Integer(),
                server_default=sa.text("0"),
                nullable=False,
            )
        )
        batch_op.add_column(
            sa.Column("two_factor_locked_until", sa.DateTime(), nullable=True)
        )
    op.create_table(
        "two_factor_recovery_codes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("code_hash", sa.String(length=80), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_two_factor_recovery_codes_user_id_users",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_two_factor_recovery_codes_user_id",
        "two_factor_recovery_codes",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_two_factor_recovery_codes_code_hash",
        "two_factor_recovery_codes",
        ["code_hash"],
        unique=False,
    )


def downgrade() -> None:
    """Remove two-factor secrets and recovery codes.

    The encrypted secrets and keyed hashes cannot be used without this
    schema, so the rows go away with the table.
    """
    op.drop_index(
        "ix_two_factor_recovery_codes_code_hash",
        table_name="two_factor_recovery_codes",
    )
    op.drop_index(
        "ix_two_factor_recovery_codes_user_id",
        table_name="two_factor_recovery_codes",
    )
    op.drop_table("two_factor_recovery_codes")
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("two_factor_locked_until")
        batch_op.drop_column("two_factor_failed_attempts")
        batch_op.drop_column("two_factor_last_step")
        batch_op.drop_column("two_factor_enabled_at")
        batch_op.drop_column("two_factor_secret")
