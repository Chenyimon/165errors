"""Scores a photo of a recyclable item and returns points.

Design note: the model does PERCEPTION only (what is this, what is it made of,
roughly how big). Python does the ARITHMETIC. This keeps scoring consistent -
the same can always earns the same points - and means we can explain the
formula to a judge without saying "the AI decided".
"""

import base64
import mimetypes
import os
from typing import Literal, Optional

import anthropic
from pydantic import BaseModel, Field

# Identity-linked API keys must say which workspace they're acting in.
# Plain keys don't need this, so it's optional.
_workspace = os.environ.get("ANTHROPIC_WORKSPACE_ID")
_headers = {"anthropic-workspace-id": _workspace} if _workspace else None

client = anthropic.Anthropic(default_headers=_headers)

MODEL = "claude-opus-5"

Material = Literal["paper", "cardboard", "glass", "plastic", "metal", "ewaste",
                   "battery", "textile", "styrofoam", "tissue", "ceramic", "other"]
Size = Literal["small", "medium", "large"]


class Perception(BaseModel):
    """What the model reports seeing. No points - that's our job."""

    is_recyclable_item: bool = Field(description="False for photos with no recyclable item (people, pets, scenery)")
    item_name: str = Field(description="Plain-English name, e.g. 'aluminium drinks can'")
    material: Material
    size: Size = Field(description="small = fits in a hand, medium = two hands, large = bigger than a shoebox")
    contaminated: bool = Field(description="True if visibly dirty, food-soiled, or still full of liquid")
    quantity: int = Field(description="How many separate items of this type are visible", ge=0)
    confidence: float = Field(description="0.0-1.0, how sure you are of the material", ge=0.0, le=1.0)
    note: str = Field(description="One short friendly sentence for the user about recycling this item")


# Points per item. Higher for materials that are harmful or hard to recycle,
# so the game rewards the recycling that actually matters - not just volume.
MATERIAL_POINTS = {
    "paper": 5,
    "cardboard": 6,
    "glass": 8,
    "plastic": 10,
    "metal": 12,
    "ewaste": 30,
    "battery": 40,
    "textile": 4,
    "styrofoam": 2,
    "tissue": 1,
    "ceramic": 2,
    "other": 3,
}

SIZE_MULTIPLIER = {"small": 1.0, "medium": 1.5, "large": 2.5}

CONTAMINATION_PENALTY = 0.5   # rinse it out and you get full points
MAX_QUANTITY = 10             # stops someone photographing a whole recycling bin
MAX_POINTS = 200


class Score(BaseModel):
    """This is the contract - exactly what the app receives. See API.md."""

    item_type: str
    material: str
    recyclable: bool
    points: int
    confidence: float
    reasoning: str
    error: Optional[str] = None


SYSTEM_PROMPT = """You identify items in photos for a recycling app used by teenagers.

Report only what you can actually see. You cannot know an item's true weight from
a photo, so judge size by comparison to the item's typical real-world size.

If the photo contains no recyclable item at all, set is_recyclable_item to false
and explain briefly in the note.

Keep the note to one short, warm, encouraging sentence - these are teenagers, not
waste-management professionals."""


SUPPORTED_TYPES = ("image/jpeg", "image/png", "image/webp", "image/gif")


def to_supported_jpeg(raw: bytes) -> str:
    """Convert any image bytes we can read into base64 JPEG.

    iPhones shoot HEIC by default and the API doesn't accept it, so anything
    unfamiliar gets converted rather than rejected. Also shrinks large photos -
    a 4000px original costs more and recognises no better than 1024px.
    """
    import io

    from PIL import Image
    import pillow_heif

    pillow_heif.register_heif_opener()

    img = Image.open(io.BytesIO(raw))
    img = img.convert("RGB")
    img.thumbnail((1024, 1024))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return base64.standard_b64encode(buf.getvalue()).decode("utf-8")


def _encode(image_path: str) -> tuple[str, str]:
    """Read an image file into base64 plus its media type."""
    media_type, _ = mimetypes.guess_type(image_path)
    with open(image_path, "rb") as f:
        raw = f.read()

    if media_type in SUPPORTED_TYPES:
        return base64.standard_b64encode(raw).decode("utf-8"), media_type

    # HEIC and anything else - convert instead of failing.
    return to_supported_jpeg(raw), "image/jpeg"


def calculate_points(p: Perception) -> int:
    """Turn what the model saw into a number. Pure arithmetic, no AI."""
    if not p.is_recyclable_item:
        return 0

    base = MATERIAL_POINTS.get(p.material, MATERIAL_POINTS["other"])
    quantity = max(1, min(p.quantity, MAX_QUANTITY))

    points = base * SIZE_MULTIPLIER[p.size] * quantity
    if p.contaminated:
        points *= CONTAMINATION_PENALTY

    return max(1, min(round(points), MAX_POINTS))


def score_image(image_b64: str, media_type: str = "image/jpeg") -> Score:
    """Score an already-base64-encoded image. This is what the server calls."""
    try:
        response = client.messages.parse(
            model=MODEL,
            max_tokens=4000,
            system=SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {
                        "type": "base64", "media_type": media_type, "data": image_b64,
                    }},
                    {"type": "text", "text": "What recyclable item is in this photo?"},
                ],
            }],
            output_format=Perception,
        )
    except anthropic.RateLimitError:
        return Score(item_type="", material="", recyclable=False, points=0,
                     confidence=0.0, reasoning="", error="We're a bit busy - try again in a moment.")
    except anthropic.APIError as e:
        return Score(item_type="", material="", recyclable=False, points=0,
                     confidence=0.0, reasoning="", error=f"Could not analyse photo: {e}")

    p = response.parsed_output

    if not p.is_recyclable_item:
        return Score(
            item_type="unknown", material="", recyclable=False, points=0,
            confidence=p.confidence, reasoning=p.note,
            error="We couldn't spot a recyclable item - try getting a bit closer.",
        )

    return Score(
        item_type=p.item_name,
        material=p.material,
        recyclable=True,
        points=calculate_points(p),
        confidence=p.confidence,
        reasoning=p.note,
    )


def score_file(image_path: str) -> Score:
    """Score an image from disk. Handy for testing from the command line."""
    image_b64, media_type = _encode(image_path)
    return score_image(image_b64, media_type)


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("usage: python scorer.py <image.jpg>")
        sys.exit(1)

    result = score_file(sys.argv[1])
    print(result.model_dump_json(indent=2))
