"""Clear demo data from the SORT/ED database.

    python reset_demo.py posts             - wipe everyone's posts, likes, comments
    python reset_demo.py posts --user NAME - wipe only that person's posts
    python reset_demo.py all               - wipe everything, including accounts

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


def clear_one_user(conn, who: str) -> None:
    """Remove a single person's posts and reset their profile counters.

    The blunt `posts` mode wipes the whole feed, which is easy to run by
    accident when you only meant to tidy up your own testing.
    """
    rows = conn.execute(
        "SELECT id, image_path FROM posts WHERE username = ?", (who,)
    ).fetchall()
    if not rows:
        print(f"  no posts found for {who!r}")

    for post_id, image_path in rows:
        conn.execute("DELETE FROM likes WHERE post_id = ?", (post_id,))
        conn.execute("DELETE FROM comments WHERE post_id = ?", (post_id,))
        if image_path:
            (UPLOADS / image_path).unlink(missing_ok=True)
    conn.execute("DELETE FROM posts WHERE username = ?", (who,))
    print(f"  cleared {len(rows)} post(s) by {who}")

    conn.execute("""
        UPDATE profiles SET total_points = 0, total_scans = 0,
                            current_streak = 0, longest_streak = 0,
                            last_scan_date = NULL, by_category = '{}'
        WHERE username = ?
    """, (who,))
    print(f"  reset {who}'s points and streaks")


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode not in ("posts", "all"):
        print(__doc__)
        sys.exit(1)

    who = None
    if "--user" in sys.argv:
        i = sys.argv.index("--user")
        if i + 1 >= len(sys.argv):
            print("--user needs a username")
            sys.exit(1)
        who = sys.argv[i + 1]
        if mode != "posts":
            print("--user only applies to `posts`")
            sys.exit(1)

    if not DB.exists():
        print(f"No database at {DB} - nothing to clear.")
        return

    backup = DB.with_suffix(f".bak-{time.strftime('%Y%m%d-%H%M%S')}")
    shutil.copy2(DB, backup)
    print(f"Backed up to {backup.name}")

    conn = sqlite3.connect(DB)

    # Collect the photos belonging to the posts we are about to remove. Avatars
    # live in the same folder, so deleting the folder's contents wholesale takes
    # people's profile pictures with it - which is exactly what happened once.
    post_images = [
        r[0] for r in conn.execute(
            "SELECT image_path FROM posts WHERE image_path IS NOT NULL"
        ).fetchall()
    ]
    # Only orphaned when the accounts themselves go.
    avatar_images = [
        r[0] for r in conn.execute(
            "SELECT avatar_path FROM profiles WHERE avatar_path IS NOT NULL"
        ).fetchall()
    ] if mode == "all" else []

    if who is not None:
        clear_one_user(conn, who)
        conn.commit()
        conn.close()
        print("\nDone. Restart the server so it picks up the change.")
        return

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
    for name in post_images:
        f = UPLOADS / name
        if f.is_file():
            f.unlink()
            removed += 1
    print(f"  deleted {removed} post photo(s)")

    avatars_removed = 0
    for name in avatar_images:
        f = UPLOADS / name
        if f.is_file():
            f.unlink()
            avatars_removed += 1

    if mode == "all":
        print(f"  deleted {avatars_removed} profile picture(s) - their accounts are gone")
    else:
        print("  profile pictures left alone")

    print("\nDone. Restart the server so it picks up the empty database.")


if __name__ == "__main__":
    main()
