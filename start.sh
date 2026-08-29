#!/usr/bin/env bash
# Starts the scoring server and the ngrok tunnel together.
#   ./start.sh                              -> random ngrok URL
#   ./start.sh your-domain.ngrok-free.app   -> your permanent domain
# Ctrl+C stops both.

set -euo pipefail
cd "$(dirname "$0")"

DOMAIN="${1:-}"
PORT=8000

if [ ! -f .env ]; then
  echo "No .env file found. Create one with:"
  echo "  echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env"
  exit 1
fi

set -a; source .env; set +a

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "ANTHROPIC_API_KEY is missing from .env"
  exit 1
fi

if ! ngrok config check >/dev/null 2>&1; then
  echo "ngrok has no authtoken yet. Run:"
  echo "  ngrok config add-authtoken YOUR_TOKEN"
  exit 1
fi

# Stop both processes when this script is interrupted.
cleanup() { echo; echo "Shutting down..."; kill 0 2>/dev/null || true; }
trap cleanup EXIT INT TERM

echo "Starting server on port $PORT..."
./.venv/bin/uvicorn server:app --host 0.0.0.0 --port "$PORT" &

# Wait for the server to answer before opening the tunnel to it.
for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then break; fi
  sleep 0.5
done

echo "Starting ngrok tunnel..."
if [ -n "$DOMAIN" ]; then
  ngrok http "$PORT" --url "https://${DOMAIN#https://}" --log stdout &
else
  ngrok http "$PORT" --log stdout &
fi

sleep 3
PUBLIC_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | ./.venv/bin/python -c "
import json, sys
try:
    tunnels = json.load(sys.stdin).get('tunnels', [])
    print(next((t['public_url'] for t in tunnels if t['public_url'].startswith('https')), ''))
except Exception:
    print('')
" 2>/dev/null || echo "")

echo
echo "======================================================"
if [ -n "$PUBLIC_URL" ]; then
  echo "  Send your team this URL:"
  echo "    $PUBLIC_URL"
  echo
  echo "  Test it from your phone (turn wifi OFF first):"
  echo "    $PUBLIC_URL/health"
else
  echo "  Tunnel starting - check http://127.0.0.1:4040 for the URL"
fi
echo "  ngrok dashboard (see every request): http://127.0.0.1:4040"
echo "======================================================"
echo
wait
