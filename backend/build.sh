#!/bin/bash
set -o errexit

pip install --upgrade pip
pip install --prefer-binary -r requirements.txt

# Create or update admin user if in production
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🔧 Setting up admin user for production..."
    python create_admin.py
fi

