#!/usr/bin/env bash
set -e

# Change to the backend directory
cd "$(dirname "$0")"

echo "=== Starting AI Outage & Runbook Assistant Backend ==="
export PYTHONPATH=.
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
