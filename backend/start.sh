#!/bin/bash
set -e

# Create tables (new databases) and run incremental migrations
python -c "
from app.db.session import engine, Base, DATABASE_URL
from sqlalchemy import text, inspect

Base.metadata.create_all(bind=engine)

# Add lot_id column to stock_movements if missing (schema migration)
inspector = inspect(engine)
if 'stock_movements' in inspector.get_table_names():
    existing_cols = [c['name'] for c in inspector.get_columns('stock_movements')]
    if 'lot_id' not in existing_cols:
        with engine.connect() as conn:
            if DATABASE_URL.startswith('sqlite'):
                conn.execute(text('ALTER TABLE stock_movements ADD COLUMN lot_id INTEGER REFERENCES product_lots(id)'))
            else:
                conn.execute(text('ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS lot_id INTEGER REFERENCES product_lots(id)'))
            conn.commit()
            print('Migration: added lot_id column to stock_movements')
"

# Create or update admin user
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Ensuring admin user exists..."
    python create_admin.py
fi

# Start the application
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
