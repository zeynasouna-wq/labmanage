"""sync prod schema

Revision ID: 817356a89c73
Revises: 818f2efe08d8
Create Date: 2026-04-17 22:18:50.441764

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '817356a89c73'
down_revision: Union[str, None] = '818f2efe08d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No schema changes needed - the models already reflect the current structure
    pass


def downgrade() -> None:
    # No downgrade needed for this version
    pass
