"""Development-only scorer. NOT the server the app talks to.

The app needs server/main.py, which serves /api/classify, auth, posts and the
leaderboard. This file only serves /score and /score-agent, so if it takes port
8000 every request from the app 404s.

Run it on a different port for testing:
    ./.venv/bin/uvicorn server:app --port 8001

Original docstring follows.

HTTP server - the bridge between the phone app and scorer.py.

The phone cannot call a Python function, so we expose score_image() as a URL
the app can POST a photo to. Run it with:

    ./.venv/bin/uvicorn server:app --reload --host 0.0.0.0 --port 8000

--host 0.0.0.0 matters: it makes the server reachable from other devices on
the wifi, not just this laptop.
"""

import base64

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent import AgentScore, score_image_agentic
from scorer import SUPPORTED_TYPES, Score, score_image, to_supported_jpeg

app = FastAPI(title="Recycling Scorer")

# Lets the app call us from a browser or emulator on a different origin.
# Fine for a hackathon; lock this down before anything real.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScoreRequest(BaseModel):
    """JSON body: a base64 photo string, as most phone camera libraries produce."""

    image: str
    media_type: str = "image/jpeg"
    user_id: str | None = None


@app.get("/health")
def health():
    """Hit this first to check the app can reach the server at all."""
    return {"status": "ok"}


@app.post("/score", response_model=Score)
def score(request: ScoreRequest) -> Score:
    """Score a photo sent as base64 JSON. This is the main endpoint."""
    # Phone libraries often prefix "data:image/jpeg;base64," - strip it.
    image = request.image
    if image.startswith("data:"):
        header, _, image = image.partition(",")
        if "image/png" in header:
            request.media_type = "image/png"

    return score_image(image, request.media_type)


@app.post("/score-upload", response_model=Score)
async def score_upload(file: UploadFile = File(...)) -> Score:
    """Score a photo sent as a normal file upload, if that's easier for the app."""
    contents = await file.read()
    media_type = file.content_type or "image/jpeg"

    if media_type in SUPPORTED_TYPES:
        image_b64 = base64.standard_b64encode(contents).decode("utf-8")
    else:
        # iPhone HEIC and anything else - convert rather than reject.
        try:
            image_b64 = to_supported_jpeg(contents)
            media_type = "image/jpeg"
        except Exception:
            return Score(item_type="", material="", recyclable=False, points=0,
                         confidence=0.0, reasoning="",
                         error="We couldn't read that image - try taking the photo again.")

    return score_image(image_b64, media_type)


@app.post("/score-agent", response_model=AgentScore)
def score_agent(request: ScoreRequest) -> AgentScore:
    """Score a photo using the tool-calling agent.

    Slower than /score (~10s vs ~4s) because Claude actually looks up the
    Singapore rules mid-reasoning, but it also returns where_to_recycle and
    handles items the blue bin won't take. Same fields as /score plus extras.
    """
    image = request.image
    if image.startswith("data:"):
        header, _, image = image.partition(",")
        if "image/png" in header:
            request.media_type = "image/png"

    return score_image_agentic(image, request.media_type)
