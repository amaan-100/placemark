"""multiturn interview and weak areas

Revision ID: 9f4b2a1c7d03
Revises: 1c2d37374802
Create Date: 2026-11-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f4b2a1c7d03'
down_revision: Union[str, Sequence[str], None] = '1c2d37374802'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'interview_turns',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('interview_id', sa.Integer(), nullable=False),
        sa.Column('turn_index', sa.Integer(), nullable=False),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('answer', sa.Text(), nullable=True),
        sa.Column('score', sa.Integer(), nullable=True),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('rubric', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['interview_id'], ['interviews.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('interview_turns', schema=None) as batch_op:
        batch_op.create_index(
            'ix_interview_turns_interview_id', ['interview_id'], unique=False
        )

    with op.batch_alter_table('interviews', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('turn_count', sa.Integer(), nullable=False, server_default='0')
        )
        batch_op.add_column(
            sa.Column('max_turns', sa.Integer(), nullable=False, server_default='3')
        )
        batch_op.add_column(
            sa.Column('weak_areas', sa.JSON(), nullable=False, server_default='[]')
        )

    # Existing single-question interviews already have one answered turn.
    op.execute(
        "UPDATE interviews SET turn_count = 1 WHERE answer IS NOT NULL"
    )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('interviews', schema=None) as batch_op:
        batch_op.drop_column('weak_areas')
        batch_op.drop_column('max_turns')
        batch_op.drop_column('turn_count')

    with op.batch_alter_table('interview_turns', schema=None) as batch_op:
        batch_op.drop_index('ix_interview_turns_interview_id')

    op.drop_table('interview_turns')
