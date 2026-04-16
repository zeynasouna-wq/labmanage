#!/bin/bash
set -e

# Script de démarrage pour Render
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
