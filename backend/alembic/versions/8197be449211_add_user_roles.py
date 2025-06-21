"""add user roles

Revision ID: 8197be449211
Revises: 0a1b702b1d4c
Create Date: 2025-06-19 14:28:00.061649

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8197be449211"
down_revision: Union[str, None] = "0a1b702b1d4c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "user_roles",
        sa.Column(
            "code",
            sa.Enum("OWNER", "ADMIN", "MEMBER", name="euserrole", native_enum=False),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("code"),
    )

    op.execute(
        sa.text("INSERT INTO user_roles (code) VALUES ('OWNER'), ('ADMIN'), ('MEMBER')")
    )

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "role_code",
                sa.Enum(
                    "OWNER", "ADMIN", "MEMBER", name="euserrole", native_enum=False
                ),
                server_default="MEMBER",
                nullable=False,
            )
        )
        batch_op.create_foreign_key(
            "fk_users_role_code",
            referent_table="user_roles",
            local_cols=["role_code"],
            remote_cols=["code"],
        )

    conn = op.get_bind()
    first_user = conn.execute(
        sa.text("SELECT * FROM users ORDER BY id LIMIT 1")
    ).first()
    if first_user is not None:
        print(
            "\033[93m"
            + f"DB migration 'add_user_roles': first user of the app '{first_user.username}' has beed assigned to the 'OWNER' role"
            + "\033[0m"
        )
        conn.execute(
            sa.text("UPDATE users SET role_code = 'OWNER' WHERE id = :uid"),
            {"uid": first_user.id},
        )


def downgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_constraint("fk_users_role_code", type_="foreignkey")
        batch_op.drop_column("role_code")

    op.drop_table("user_roles")
