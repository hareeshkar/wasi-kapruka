#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# keep-alive.sh — Pings your Render service every 10 minutes to prevent spin-down
#
# Usage:
#   1. Set RENDER_URL env var to your service URL
#   2. Run:  bash scripts/keep-alive.sh
#   3. Or add to crontab:  */10 * * * * RENDER_URL=https://wasi.onrender.com bash /path/to/scripts/keep-alive.sh
#
# Free alternatives to running this locally:
#   - https://cron-job.org (free, set 10-min interval)
#   - https://uptimerobot.com (free tier, monitors uptime + pings)
#   - https://kaffeine.herokuapp.com (free Render-specific pinger)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RENDER_URL="${RENDER_URL:?Set RENDER_URL env var first}"
INTERVAL="${INTERVAL:-600}"  # seconds (default 10 min)

echo "[keep-alive] Pinging ${RENDER_URL} every ${INTERVAL}s (Ctrl+C to stop)"

while true; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${RENDER_URL}/health" 2>/dev/null || echo "000")
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] /health → ${STATUS}"
  sleep "${INTERVAL}"
done
