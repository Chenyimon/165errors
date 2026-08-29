#!/usr/bin/env bash
# Waits for photos to appear in ~/Downloads/test_photos, then scores them.
cd "$(dirname "$0")"
set -a; source .env; set +a
FOLDER="$HOME/Downloads/test_photos"
mkdir -p "$FOLDER"

echo "Watching $FOLDER — drop photos in. Ctrl+C to stop."
LAST=0
while true; do
  COUNT=$(ls -1 "$FOLDER" 2>/dev/null | grep -icE '\.(jpg|jpeg|png|heic|webp)$' || echo 0)
  if [ "$COUNT" -gt "$LAST" ] && [ "$COUNT" -gt 0 ]; then
    sleep 2   # let the copy finish
    echo; echo "=== $COUNT photo(s) found — scoring ==="
    ./.venv/bin/python test_batch.py "$FOLDER"
    LAST=$COUNT
  fi
  sleep 3
done
