"""Bridges the SORT/ED API to the agent scorer in the repo root.

The mobile app already calls POST /api/classify and expects five fields back.
This keeps that contract exactly, so nothing in the app has to change, while
swapping the classifier underneath for the tool-calling agent - which checks
Singapore's rules, scores each object separately, refuses shop displays, and
declines to guess on unusable photos.

Extra fields are added alongside the original five. JSON consumers ignore
fields they don't read, so the app keeps working; adopting them is optional.
"""

import sys
from pathlib import Path

# agent.py, scorer.py and sg_rules.py live one level up.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agent import score_image_agentic  # noqa: E402

# Most agent materials have a matching app category. The ones with no recycling
# route at all (styrofoam, tissue, ceramic) collapse to "other"; the richer
# material always survives in the `items` array.
CATEGORY_MAP = {
    "plastic": "plastic",
    "glass": "glass",
    "metal": "metal",
    "paper": "paper",
    "cardboard": "paper",
    "food_waste": "compost",
    "battery": "battery",
    "ewaste": "ewaste",
    "textile": "textile",
    "styrofoam": "other",
    "tissue": "other",
    "ceramic": "other",
    "other": "other",
}


def classify(image_base64: str, media_type: str = "image/jpeg") -> dict:
    """Score a photo and return it in the shape the mobile app expects."""
    result = score_image_agentic(image_base64, media_type)

    # Unusable photo, shop display, or no recyclable item found.
    if result.error:
        return {
            "category": "other",
            "item_name": (result.item_type or "Unclear")[:60],
            "size_bucket": "medium",
            "fun_fact": result.error[:280],
            "needs_confirmation": True,
            # extras
            "points": 0,
            "where_to_recycle": "",
            "blue_bin": False,
            "items": [],
            "error": result.error,
        }

    first = result.items[0] if result.items else None
    material = first.material if first else "other"

    return {
        "category": CATEGORY_MAP.get(material, "other"),
        "item_name": (result.item_type or "Item")[:60],
        "size_bucket": first.size if first else "medium",
        "fun_fact": (result.reasoning or "")[:280],
        "needs_confirmation": result.needs_confirmation,
        # --- extras the app may adopt ---
        # `points` is the agent's own scoring: weighted by how harmful and how
        # hard to recycle an item is, summed per object. The app currently
        # computes points client-side from CO2 instead, which scores a battery
        # at 7. Switch to this field to use the agent's scoring.
        "points": result.points,
        "where_to_recycle": result.where_to_recycle,
        "blue_bin": result.blue_bin,
        "items": [i.model_dump() for i in result.items],
        "error": None,
    }
