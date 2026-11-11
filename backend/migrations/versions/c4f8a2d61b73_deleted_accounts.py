"""accounts: deleted-account tombstones

A still-valid access token must not resurrect a deleted account. Recording the
subject id permanently (until explicitly cleared) makes deletion stick.

Revision ID: c4f8a2d61b73
Revises: b7c1e4d92a10
Create Date: 2026-11-11 21:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4f8a2d61b73'
down_revision: Union[str, Sequence[str], None] = 'b7c1e4d92a10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'deleted_accounts',
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('user_id'),
    )


def downgrade() -> None:
    op.drop_table('deleted_accounts')
