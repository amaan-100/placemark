"""accounts: users table and session ownership

Revision ID: b7c1e4d92a10
Revises: 9f4b2a1c7d03
Create Date: 2026-11-11 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c1e4d92a10'
down_revision: Union[str, Sequence[str], None] = '9f4b2a1c7d03'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column('display_name', sa.String(length=120), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', name='uq_users_email'),
    )

    with op.batch_alter_table('sessions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.String(length=36), nullable=True))
        batch_op.create_foreign_key(
            'fk_sessions_user_id',
            'users',
            ['user_id'],
            ['id'],
            ondelete='CASCADE',
        )
        batch_op.create_index('ix_sessions_user_id', ['user_id'], unique=False)

    # One session per account. Partial so anonymous rows (user_id IS NULL) are
    # unaffected and never collide.
    op.create_index(
        'uq_sessions_one_per_user',
        'sessions',
        ['user_id'],
        unique=True,
        postgresql_where=sa.text('user_id IS NOT NULL'),
        sqlite_where=sa.text('user_id IS NOT NULL'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('uq_sessions_one_per_user', table_name='sessions')

    with op.batch_alter_table('sessions', schema=None) as batch_op:
        batch_op.drop_index('ix_sessions_user_id')
        batch_op.drop_constraint('fk_sessions_user_id', type_='foreignkey')
        batch_op.drop_column('user_id')

    op.drop_table('users')
