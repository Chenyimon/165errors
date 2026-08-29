"""Score a folder of photos and print a comparison table.

    ./.venv/bin/python test_batch.py ~/Downloads/test_photos
    ./.venv/bin/python test_batch.py photo1.jpg photo2.heic

Runs both the fast scorer and the agent on each image so you can see where
they disagree - that's usually where a scoring rule needs tuning.
"""

import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from agent import score_file_agentic
from scorer import score_file

EXTS = {".jpg", ".jpeg", ".png", ".heic", ".webp", ".gif"}


def collect(args: list[str]) -> list[Path]:
    paths: list[Path] = []
    for arg in args:
        p = Path(arg).expanduser()
        if p.is_dir():
            paths += sorted(f for f in p.iterdir() if f.suffix.lower() in EXTS)
        elif p.suffix.lower() in EXTS:
            paths.append(p)
    return paths


def main() -> None:
    photos = collect(sys.argv[1:])
    if not photos:
        print("usage: python test_batch.py <folder or image files>")
        sys.exit(1)

    print(f"\nScoring {len(photos)} photo(s) in parallel\n")
    started = time.time()

    def score_one(photo: Path):
        """Both scorers for one photo. Runs in its own thread."""
        try:
            t = time.time()
            fast = score_file(str(photo))
            ag = score_file_agentic(str(photo))
            return photo, fast, ag, time.time() - t, None
        except Exception as e:
            return photo, None, None, 0.0, e

    # The API handles these concurrently; 6 at a time stays well clear of rate limits.
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(score_one, photos))

    print(f"{'photo':<24} {'item':<30} {'mat':<10} {'pts':>4}  {'calls':>5}  where")
    print("-" * 110)

    disagreements = []

    for photo, fast, ag, elapsed, err in results:
        if err is not None:
            print(f"{photo.name:<24} ERROR: {err}")
            continue

        name = photo.name[:23]
        item = (ag.item_type or ag.error or "?")[:29]
        print(f"{name:<24} {item:<30} {ag.material:<10} {ag.points:>4}  "
              f"{ag.tool_calls:>5}  {ag.where_to_recycle or '-'}  ({elapsed:.1f}s)")

        if fast.points != ag.points:
            disagreements.append((photo.name, fast.points, ag.points))

    print(f"\ntotal wall time: {time.time() - started:.1f}s")

    if disagreements:
        print("\nScoring differences between /score and /score-agent:")
        for name, f, a in disagreements:
            print(f"  {name}: fast={f} agent={a}")
    print()


if __name__ == "__main__":
    main()
