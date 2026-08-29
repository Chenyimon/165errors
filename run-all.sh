#!/usr/bin/env bash
# Starts everything: the SORT/ED API, the ngrok tunnel, and the Expo dev server.
#
#   ./run-all.sh           - Expo on the local network (same wifi as your phone)
#   ./run-all.sh --tunnel  - Expo over a tunnel (any network; URL changes each run)
#
# Ctrl+C stops all three.

set -uo pipefail
cd "$(dirname "$0")"

DOMAIN="canine-cupbearer-cringing.ngrok-free.dev"
PORT=8000
EXPO_MODE="${1:-}"

if [ ! -f .env ]; then
  echo "No .env file. Create one:  echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env"
  exit 1
fi
set -a; source .env; set +a

cleanup() {
  echo; echo "Shutting down..."
  pkill -f "uvicorn main:app" 2>/dev/null
  pkill -f "ngrok http"       2>/dev/null
  pkill -f "expo start"       2>/dev/null
  kill 0 2>/dev/null
}
trap cleanup EXIT INT TERM

# Clear anything stale - a leftover server on 8000 serves the wrong app.
pkill -f "uvicorn main:app"   2>/dev/null
pkill -f "uvicorn server:app" 2>/dev/null
pkill -f "ngrok http"         2>/dev/null
pkill -f "expo start"         2>/dev/null
sleep 2

echo "[1/3] SORT/ED API on port $PORT..."
( cd server && exec ../.venv/bin/uvicorn main:app --host 0.0.0.0 --port "$PORT" ) \
  > /tmp/sorted-server.log 2>&1 &

for _ in $(seq 1 30); do
  curl -sf "http://127.0.0.1:$PORT/health" >/dev/null 2>&1 && break
  sleep 0.5
done

HEALTH=$(curl -s "http://127.0.0.1:$PORT/health" 2>/dev/null)
case "$HEALTH" in
  *'"ok"'*) echo "      up - $HEALTH" ;;
  *)        echo "      WARNING: unexpected response: ${HEALTH:-none}" ;;
esac

echo "[2/3] ngrok tunnel..."
ngrok http "$PORT" --url "https://$DOMAIN" --log stdout > /tmp/sorted-ngrok.log 2>&1 &
sleep 4
curl -sf "https://$DOMAIN/health" >/dev/null 2>&1 \
  && echo "      up - https://$DOMAIN" \
  || echo "      WARNING: tunnel not answering yet"

echo "[3/3] Expo..."
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
( cd mobile && REACT_NATIVE_PACKAGER_HOSTNAME="$IP" exec npx expo start ${EXPO_MODE:---lan} ) \
  > /tmp/sorted-expo.log 2>&1 &
sleep 25

if [ "$EXPO_MODE" = "--tunnel" ]; then
  EXPO_URL=$(curl -s http://127.0.0.1:4041/api/tunnels 2>/dev/null \
    | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4 | sed 's|https://|exp://|')
else
  EXPO_URL="exp://${IP}:8081"
fi

echo
echo "============================================================"
echo "  API      https://$DOMAIN        (never changes)"
echo "  Expo     ${EXPO_URL:-check /tmp/sorted-expo.log}"
echo
if [ "$EXPO_MODE" = "--tunnel" ]; then
  echo "  Tunnel mode: works on any network, but this URL is new"
  echo "  every run, so Expo Go's Recents will not have it."
else
  echo "  LAN mode: phone must be on the same wifi. This URL is"
  echo "  stable, so Expo Go remembers it under Recently opened."
fi
echo
echo "  Logs: /tmp/sorted-{server,ngrok,expo}.log"
echo "  Ctrl+C stops everything."
echo "============================================================"
echo

# Regenerate the QR so it always matches the current Expo URL.
if [ -n "${EXPO_URL:-}" ]; then
  ./.venv/bin/python -c "
import qrcode, sys
qrcode.make('$EXPO_URL', box_size=12, border=3).save('/Users/chenyifu/Desktop/expo-qr.png')
" 2>/dev/null && echo "  QR code updated: ~/Desktop/expo-qr.png" && echo
fi

wait
