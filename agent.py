"""The agentic scorer.

Unlike scorer.py (one call: photo -> points), this runs a real tool loop.
Claude looks at the photo, decides to call check_blue_bin, may then call
find_disposal_point, and only then submits its answer. Each photo takes
2-4 API calls rather than one.

The tools are ordinary Python functions in sg_rules.py. Claude chooses when to
call them; we don't script it.
"""

import os
from typing import Literal, Optional

import anthropic
from anthropic import beta_tool
from pydantic import BaseModel

from scorer import (MATERIAL_POINTS, MAX_POINTS, Perception, Score,
                    _encode, calculate_points)
from sg_rules import check_blue_bin, find_disposal_point

_workspace = os.environ.get("ANTHROPIC_WORKSPACE_ID")
_headers = {"anthropic-workspace-id": _workspace} if _workspace else None
client = anthropic.Anthropic(default_headers=_headers)

MODEL = "claude-opus-5"

# Below this, ask the user to confirm rather than silently trusting the label.
# Measured across our test photos: unambiguous items land at 0.90, genuinely
# tricky ones (a melamine sponge that looks like styrofoam, a stone) at
# 0.80-0.85. A lower threshold would never fire.
CONFIDENCE_THRESHOLD = 0.85

# Below this the photo is too poor to trust at all - a dark, blurred shot got
# 0.5 and confidently reported a bubble tea cup as a roll of tissue. Award
# nothing and ask for a retake rather than paying out for a guess.
UNUSABLE_THRESHOLD = 0.6


# --- The tools Claude can choose to call -------------------------------------

@beta_tool
def blue_bin_check(material: str, item_name: str, contaminated: bool) -> str:
    """Check whether an item belongs in Singapore's national blue recycling bin.

    Call this for every item, before deciding anything.

    Args:
        material: One of paper, cardboard, plastic, metal, glass, ewaste,
            battery, textile, food_waste, styrofoam, tissue, ceramic, other.
        item_name: Plain-English name of the item, e.g. "aluminium drinks can".
        contaminated: True if the item still holds liquid or food residue.
    """
    return check_blue_bin(material, item_name, contaminated)


@beta_tool
def disposal_point(category: str) -> str:
    """Find where in Singapore to take something the blue bin will not accept.

    Args:
        category: One of battery, ewaste, textile, food_waste, styrofoam,
            tissue, ceramic, other.
    """
    return find_disposal_point(category)


class Item(BaseModel):
    """One distinct thing in the photo. A photo may hold several."""

    name: str                # "aluminium drinks can"
    material: Literal["paper", "cardboard", "glass", "plastic", "metal", "ewaste",
                      "battery", "textile", "food_waste", "styrofoam", "tissue",
                      "ceramic", "other"]
    # Literal, not str - with a plain string Claude wrote "about 500ml,
    # hand-sized" and every such answer silently fell back to "small".
    size: Literal["small", "medium", "large"]
    quantity: int            # how many of THIS item
    contaminated: bool       # still holds liquid or food residue
    blue_bin: bool           # does this one go in the blue bin
    where_to_recycle: str    # where this one actually goes


class AgentResult(BaseModel):
    """What the agent submits once it has finished reasoning."""

    items: list[Item]
    confidence: float
    advice: str          # one friendly sentence covering the whole photo
    looks_like_retail_display: bool = False


@beta_tool
def submit(
    items: list[Item],
    confidence: float,
    advice: str,
    looks_like_retail_display: bool,
) -> str:
    """Submit your final answer. Call this last, after checking the rules.

    Args:
        items: Every distinct thing in the photo, one entry each. A battery next
            to a drinks can is TWO entries with different materials - never
            merge different materials into one entry. Use quantity only for
            several of the same thing (three identical cans is one entry with
            quantity 3).
        confidence: 0.0 to 1.0, how sure you are overall.
        advice: One short, warm sentence covering the whole photo.
        looks_like_retail_display: True if this looks like goods for sale rather
            than something being thrown away - items on a shop shelf or rack,
            price tags or barcodes, several identical new products together,
            or anything still packaged and unused.
    """
    return "Recorded."


SYSTEM_PROMPT = """You help teenagers in Singapore recycle correctly.

Identify what is in the photo, work out how it should actually be disposed of
here, then call submit with your answer. You have tools for looking up the
rules - decide for yourself which you need and in what order. Never guess at a
rule you could look up.

Singapore uses one national commingled blue bin, so the rules are the same
island-wide. Contamination is the real problem here - roughly 40% of what goes
into blue bins is spoiled by food and liquid residue.

You cannot know an item's weight from a photo, so judge size by comparison to
the item's typical real-world size.

Keep the advice to one short, warm sentence. These are teenagers, not
waste-management professionals."""


class ScoredItem(BaseModel):
    """One item from the photo, with its own points."""

    name: str
    material: str
    quantity: int
    points: int
    blue_bin: bool
    where_to_recycle: str


class AgentScore(Score):
    """The Score contract, plus the agent's extra findings.

    Added fields only - every field the app already reads is unchanged.
    """

    blue_bin: bool = True
    where_to_recycle: str = ""
    tool_calls: int = 0
    items: list[ScoredItem] = []
    needs_confirmation: bool = False


def score_image_agentic(image_b64: str, media_type: str = "image/jpeg") -> AgentScore:
    """Score a photo using the tool-calling agent."""
    tool_calls = 0
    submitted: Optional[dict] = None

    try:
        runner = client.beta.messages.tool_runner(
            model=MODEL,
            max_tokens=8000,
            system=SYSTEM_PROMPT,
            # Low effort: this is classification plus a lookup, not hard reasoning.
            # Measured identical answers to high effort, ~6s faster.
            output_config={"effort": "low"},
            tools=[blue_bin_check, disposal_point, submit],
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {
                        "type": "base64", "media_type": media_type, "data": image_b64,
                    }},
                    {"type": "text", "text": "What is this, and how should I recycle it in Singapore?"},
                ],
            }],
        )
        for message in runner:
            for block in message.content:
                if block.type != "tool_use":
                    continue
                tool_calls += 1
                # Read the answer straight off the tool call. Keeping it in a
                # local means concurrent requests can't overwrite each other.
                if block.name == "submit":
                    submitted = block.input
    except anthropic.APIError as e:
        return AgentScore(item_type="", material="", recyclable=False, points=0,
                          confidence=0.0, reasoning="", error=f"Could not analyse photo: {e}")

    result = AgentResult(**submitted) if submitted else None
    if result is None:
        return AgentScore(item_type="", material="", recyclable=False, points=0,
                          confidence=0.0, reasoning="",
                          error="We couldn't work out what that was - try another photo.")

    # Too dark or blurred to identify anything. The model already knows it is
    # guessing, so don't award points for the guess.
    if result.confidence < UNUSABLE_THRESHOLD:
        return AgentScore(
            item_type="unclear", material="", recyclable=False, points=0,
            confidence=result.confidence, reasoning="",
            tool_calls=tool_calls, needs_confirmation=True,
            error="Too dark or blurry to make out - try again with more light?",
        )

    # Photographing a shop shelf is the obvious way to farm points, so refuse
    # anything that looks like stock for sale rather than something being
    # disposed of.
    if result.looks_like_retail_display:
        return AgentScore(
            item_type=" + ".join(i.name for i in result.items) or "unknown",
            material=result.items[0].material if result.items else "",
            recyclable=False, points=0, confidence=result.confidence,
            reasoning=result.advice,
            blue_bin=all(i.blue_bin for i in result.items) if result.items else False,
            where_to_recycle="; ".join(
                dict.fromkeys(i.where_to_recycle for i in result.items if i.where_to_recycle)
            ),
            tool_calls=tool_calls,
            error="That looks like something in a shop. Photograph what you're actually recycling.",
        )

    # Score each item on its own terms, then add them up. A battery beside a
    # can must not be scored as two batteries.
    scored: list[ScoredItem] = []
    total = 0

    for item in result.items:
        material = item.material if item.material in MATERIAL_POINTS else "other"
        size = item.size if item.size in ("small", "medium", "large") else "small"

        # Blue-bin items score normally. Items with a real route elsewhere
        # (battery, e-waste, textiles) also earn - carrying them somewhere is
        # more effort, not less. Things with no route at all stay at zero.
        has_route = item.blue_bin or material in ("battery", "ewaste", "textile")

        pts = calculate_points(Perception(
            is_recyclable_item=has_route,
            item_name=item.name,
            material=material,
            size=size,
            contaminated=item.contaminated and item.blue_bin,
            quantity=item.quantity,
            confidence=result.confidence,
            note=result.advice,
        )) if has_route else 0

        total += pts
        scored.append(ScoredItem(
            name=item.name, material=material, quantity=item.quantity,
            points=pts, blue_bin=item.blue_bin,
            where_to_recycle=item.where_to_recycle,
        ))

    total = min(total, MAX_POINTS)

    return AgentScore(
        item_type=" + ".join(i.name for i in scored) or "unknown",
        material=scored[0].material if scored else "",
        recyclable=any(i.points > 0 for i in scored),
        points=total,
        confidence=result.confidence,
        reasoning=result.advice,
        blue_bin=all(i.blue_bin for i in scored) if scored else False,
        where_to_recycle="; ".join(
            dict.fromkeys(i.where_to_recycle for i in scored if i.where_to_recycle)
        ),
        tool_calls=tool_calls,
        items=scored,
        needs_confirmation=result.confidence < CONFIDENCE_THRESHOLD,
        error=None,
    )


def score_file_agentic(image_path: str) -> AgentScore:
    """Score an image from disk. For testing from the command line."""
    image_b64, media_type = _encode(image_path)
    return score_image_agentic(image_b64, media_type)


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("usage: python agent.py <image.jpg>")
        sys.exit(1)

    print(score_file_agentic(sys.argv[1]).model_dump_json(indent=2))
