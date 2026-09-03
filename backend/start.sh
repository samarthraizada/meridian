#!/bin/bash
echo "Running dbt parse..."
cd /app/meridian_dbt && dbt parse
echo "Starting API server..."
cd /app && uvicorn backend.main:app --host 0.0.0.0 --port "${PORT:-8000}"