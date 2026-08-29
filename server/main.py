import json
import os
import re
import time
import uuid
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from db import get_conn, init_db

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
APP_SECRET = os.environ.get("APP_SECRET")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = (
    "You are a recycling classifier for an app called SORT/ED. Given a photo of an item, "
    "respond with ONLY a raw JSON object, no markdown fences, no extra text, exactly in this shape: "
    '{"category":"plastic|glass|metal|paper|compost|other","item_name":"short 2-4 word name of the item",'
    '"size_bucket":"small|medium|large","fun_fact":"one short sentence, under 25 words, about the '
    'environmental benefit of recycling this specific material"}. If the photo does not clearly show a '
    'recyclable item, use category "other".'
)

VALID_CATEGORIES = {"plastic", "glass", "metal", "paper", "compost", "other"}
VALID_SIZES = {"small", "medium", "large"}
VALID_MEDIA_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

app = FastAPI(title="SORT/ED API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN] if ALLOWED_ORIGIN != "*" else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


def check_secret(x_app_secret: Optional[str]):
    if APP_SECRET and x_app_secret != APP_SECRET:
        raise HTTPException(status_code=401, detail="invalid app secret")


class ClassifyRequest(BaseModel):
    image_base64: str
    media_type: str = "image/jpeg"


DEFAULT_PROFILE = {
    "username": None,
    "totalPoints": 0,
    "currentStreak": 0,
    "longestStreak": 0,
    "lastScanDate": None,
    "totalScans": 0,
    "byCategory": {},
}


class ProfileIn(BaseModel):
    username: Optional[str] = None
    totalPoints: int = 0
    currentStreak: int = 0
    longestStreak: int = 0
    lastScanDate: Optional[str] = None
    totalScans: int = 0
    byCategory: dict = {}


def row_to_profile(row) -> dict:
    return {
        "username": row["username"],
        "totalPoints": row["total_points"],
        "currentStreak": row["current_streak"],
        "longestStreak": row["longest_streak"],
        "lastScanDate": row["last_scan_date"],
        "totalScans": row["total_scans"],
        "byCategory": json.loads(row["by_category"] or "{}"),
    }


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/api/classify")
async def classify(req: ClassifyRequest, x_app_secret: Optional[str] = Header(default=None)):
    check_secret(x_app_secret)

    if req.media_type not in VALID_MEDIA_TYPES:
        raise HTTPException(status_code=400, detail="unsupported media type")

    anthropic_body = {
        "model": MODEL,
        "max_tokens": 300,
        "system": SYSTEM_PROMPT,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": req.media_type,
                            "data": req.image_base64,
                        },
                    },
                    {"type": "text", "text": "Classify this item for recycling."},
                ],
            }
        ],
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            ANTHROPIC_URL,
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": ANTHROPIC_VERSION,
                "content-type": "application/json",
            },
            json=anthropic_body,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="classification upstream error")

    data = resp.json()
    text_block = next(
        (b["text"] for b in data.get("content", []) if b.get("type") == "text"), "{}"
    )
    cleaned = re.sub(r"```json|```", "", text_block).strip()

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="could not parse classification")

    category = result.get("category")
    if category not in VALID_CATEGORIES:
        category = "other"
    size_bucket = result.get("size_bucket")
    if size_bucket not in VALID_SIZES:
        size_bucket = "medium"

    return {
        "category": category,
        "item_name": str(result.get("item_name") or "Item")[:60],
        "size_bucket": size_bucket,
        "fun_fact": str(result.get("fun_fact") or "")[:280],
    }


@app.get("/api/profile/{device_id}")
def get_profile(device_id: str):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM profiles WHERE device_id = ?", (device_id,)
        ).fetchone()
    return row_to_profile(row) if row else DEFAULT_PROFILE


@app.put("/api/profile/{device_id}")
def put_profile(
    device_id: str,
    profile: ProfileIn,
    x_app_secret: Optional[str] = Header(default=None),
):
    check_secret(x_app_secret)
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO profiles
                (device_id, username, total_points, current_streak, longest_streak, last_scan_date, total_scans, by_category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(device_id) DO UPDATE SET
                username=excluded.username,
                total_points=excluded.total_points,
                current_streak=excluded.current_streak,
                longest_streak=excluded.longest_streak,
                last_scan_date=excluded.last_scan_date,
                total_scans=excluded.total_scans,
                by_category=excluded.by_category
            """,
            (
                device_id,
                profile.username,
                profile.totalPoints,
                profile.currentStreak,
                profile.longestStreak,
                profile.lastScanDate,
                profile.totalScans,
                json.dumps(profile.byCategory),
            ),
        )
    return {"ok": True}


@app.get("/api/leaderboard")
def leaderboard():
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT username, total_points FROM profiles
            WHERE username IS NOT NULL
            ORDER BY total_points DESC
            LIMIT 100
            """
        ).fetchall()
    return [{"username": r["username"], "points": r["total_points"]} for r in rows]


@app.get("/api/posts")
def list_posts(limit: int = 50):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM posts ORDER BY ts DESC LIMIT ?", (min(max(limit, 1), 100),)
        ).fetchall()
    return [
        {
            "id": r["id"],
            "ts": r["ts"],
            "username": r["username"],
            "category": r["category"],
            "itemName": r["item_name"],
            "weightG": r["weight_g"],
            "co2G": r["co2_g"],
            "points": r["points"],
            "funFact": r["fun_fact"],
            "imageUrl": f"/uploads/{r['image_path']}" if r["image_path"] else None,
        }
        for r in rows
    ]


@app.post("/api/posts")
async def create_post(
    username: str = Form(...),
    category: str = Form(...),
    item_name: str = Form(...),
    weight_g: int = Form(...),
    co2_g: int = Form(...),
    points: int = Form(...),
    fun_fact: str = Form(""),
    image: UploadFile = File(...),
    x_app_secret: Optional[str] = Header(default=None),
):
    check_secret(x_app_secret)

    if category not in VALID_CATEGORIES:
        category = "other"
    if image.content_type not in VALID_MEDIA_TYPES:
        raise HTTPException(status_code=400, detail="unsupported media type")

    post_id = uuid.uuid4().hex
    ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}[image.content_type]
    filename = f"{post_id}{ext}"
    contents = await image.read()
    (UPLOAD_DIR / filename).write_bytes(contents)

    ts = int(time.time() * 1000)
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO posts (id, ts, username, category, item_name, weight_g, co2_g, points, fun_fact, image_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (post_id, ts, username, category, item_name.strip()[:80], weight_g, co2_g, points, fun_fact.strip()[:280], filename),
        )

    return {
        "id": post_id,
        "ts": ts,
        "username": username,
        "category": category,
        "itemName": item_name.strip()[:80],
        "weightG": weight_g,
        "co2G": co2_g,
        "points": points,
        "funFact": fun_fact.strip()[:280],
        "imageUrl": f"/uploads/{filename}",
    }
