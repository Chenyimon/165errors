"""Clear demo data from the SORT/ED database.

    python reset_demo.py posts     - wipe posts, likes, comments; keep accounts
    python reset_demo.py all       - wipe everything, including accounts

Always writes a timestamped backup of app.db next to it first, so a mistake
is recoverable: copy the .bak file back over app.db.
"""

import os
import shutil
import sqlite3
import sys
import time
from pathlib import Path

HERE = Path(__file__).parent
DB = Path(os.environ.get("DB_PATH", HERE / "app.db"))
UPLOADS = Path(os.environ.get("UPLOAD_DIR", HERE / "uploads"))


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode not in ("posts", "all"):
        print(__doc__)
        sys.exit(1)

    if not DB.exists():
        print(f"No database at {DB} - nothing to clear.")
        return

    backup = DB.with_suffix(f".bak-{time.strftime('%Y%m%d-%H%M%S')}")
    shutil.copy2(DB, backup)
    print(f"Backed up to {backup.name}")

    conn = sqlite3.connect(DB)
    tables = ["comments", "likes", "posts"]
    if mode == "all":
        tables += ["friends", "sessions", "profiles", "users"]

    for t in tables:
        n = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        conn.execute(f"DELETE FROM {t}")
        print(f"  cleared {t:<10} ({n} rows)")

    if mode == "posts":
        # Points and streaks live on the profile, so reset them too - otherwise
        # the leaderboard still shows scores for posts that no longer exist.
        conn.execute("""
            UPDATE profiles SET total_points = 0, total_scans = 0,
                                current_streak = 0, longest_streak = 0,
                                last_scan_date = NULL, by_category = '{}'
        """)
        print("  reset profile points and streaks")

    conn.commit()
    conn.close()

    removed = 0
    if UPLOADS.exists():
        for f in UPLOADS.iterdir():
            if f.is_file() and not f.name.startswith("."):
                f.unlink()
                removed += 1
    print(f"  deleted {removed} uploaded photo(s)")

    print("\nDone. Restart the server so it picks up the empty database.")


if __name__ == "__main__":
    main()
