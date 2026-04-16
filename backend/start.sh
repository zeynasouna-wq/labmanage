#!/bin/bash
set -e

# Create tables and admin user on first run
python -c "from app.db.session import engine, Base; Base.metadata.create_all(bind=engine)"

# Create or update admin user
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🔧 Ensuring admin user exists..."
    python create_admin.py
fi

# Start the application
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
