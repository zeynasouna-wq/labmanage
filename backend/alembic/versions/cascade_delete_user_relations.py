"""Add cascade delete for user relationships

Revision ID: cascade_delete_user_relations
Revises: 817356a89c73
Create Date: 2026-04-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cascade_delete_user_relations'
down_revision: Union[str, None] = '817356a89c73'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite: For SQLite, constraints are handled at the model level
    # This migration is a no-op for SQLite but would be needed for PostgreSQL
    # When migrating to PostgreSQL, uncomment the code below:
    
    # PostgreSQL: Add CASCADE DELETE to stock_movements.user_id
    # op.drop_constraint('stock_movements_user_id_fkey', 'stock_movements', type_='foreignkey')
    # op.create_foreign_key('stock_movements_user_id_fkey', 'stock_movements', 'users',
    #                       ['user_id'], ['id'], ondelete='CASCADE')
    
    # PostgreSQL: Add SET NULL to alerts.acknowledged_by_id
    # op.drop_constraint('alerts_acknowledged_by_id_fkey', 'alerts', type_='foreignkey')
    # op.create_foreign_key('alerts_acknowledged_by_id_fkey', 'alerts', 'users',
    #                       ['acknowledged_by_id'], ['id'], ondelete='SET NULL')
    pass


def downgrade() -> None:
    # No downgrade needed for this SQLite-compatible version
    pass
