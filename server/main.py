import json
import os
import random
import re
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool

import agent_bridge
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from auth import hash_password, new_token, verify_password
from db import get_conn, init_db

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
APP_SECRET = os.environ.get("APP_SECRET")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)



VALID_CATEGORIES = {"plastic", "glass", "metal", "paper", "compost",
                    "battery", "ewaste", "textile", "other"}
VALID_SIZES = {"small", "medium", "large"}
VALID_MEDIA_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,24}$")
MIN_PASSWORD_LEN = 6

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


def get_current_username(authorization: Optional[str] = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = authorization[len("Bearer "):].strip()
    with get_conn() as conn:
        row = conn.execute("SELECT username FROM sessions WHERE token = ?", (token,)).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="invalid or expired session")
    return row["username"]


def get_optional_username(authorization: Optional[str] = Header(default=None)) -> Optional[str]:
    """Like get_current_username, but returns None (instead of raising) when there's no
    valid session — used by endpoints that guest users may also call, such as posting."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[len("Bearer "):].strip()
    with get_conn() as conn:
        row = conn.execute("SELECT username FROM sessions WHERE token = ?", (token,)).fetchone()
    return row["username"] if row else None


def format_guest_name(guest_tag: Optional[str]) -> str:
    # The space makes this pattern impossible to collide with a real username,
    # since USERNAME_RE forbids spaces.
    if guest_tag and re.fullmatch(r"\d{4}", guest_tag):
        return f"Guest {guest_tag}"
    return f"Guest {random.randint(1000, 9999)}"


def guest_display_name(guest_tag: Optional[str]) -> Optional[str]:
    """Like format_guest_name, but returns None (instead of a random fallback) for an
    invalid/missing tag — used when merely looking up an identity, not creating one."""
    if guest_tag and re.fullmatch(r"\d{4}", guest_tag):
        return f"Guest {guest_tag}"
    return None


def resolve_identity(username: Optional[str], guest_tag: Optional[str]):
    """Returns (display_name, is_guest) for whoever is making the request."""
    if username:
        return username, False
    return format_guest_name(guest_tag), True


class ClassifyRequest(BaseModel):
    image_base64: str
    media_type: str = "image/jpeg"


class SignupRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class ProfileIn(BaseModel):
    totalPoints: int = 0
    currentStreak: int = 0
    longestStreak: int = 0
    lastScanDate: Optional[str] = None
    totalScans: int = 0
    byCategory: dict = {}


class FriendRequest(BaseModel):
    username: str


class GuestIdentity(BaseModel):
    guest_tag: Optional[str] = None


class CommentIn(BaseModel):
    text: str
    guest_tag: Optional[str] = None


DEFAULT_PROFILE = {
    "totalPoints": 0,
    "currentStreak": 0,
    "longestStreak": 0,
    "lastScanDate": None,
    "totalScans": 0,
    "byCategory": {},
}


def row_to_profile(row) -> dict:
    return {
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


# ---------- Auth ----------
@app.post("/api/auth/signup")
def signup(req: SignupRequest, x_app_secret: Optional[str] = Header(default=None)):
    check_secret(x_app_secret)
    username = req.username.strip()
    if not USERNAME_RE.match(username):
        raise HTTPException(status_code=400, detail="username must be 3-24 letters, numbers, or underscores")
    if len(req.password) < MIN_PASSWORD_LEN:
        raise HTTPException(status_code=400, detail=f"password must be at least {MIN_PASSWORD_LEN} characters")

    salt, pw_hash = hash_password(req.password)
    now = int(time.time())
    with get_conn() as conn:
        existing = conn.execute("SELECT 1 FROM users WHERE username = ?", (username,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="username already taken")
        conn.execute(
            "INSERT INTO users (username, salt, password_hash, created_at) VALUES (?, ?, ?, ?)",
            (username, salt, pw_hash, now),
        )
        conn.execute("INSERT OR IGNORE INTO profiles (username) VALUES (?)", (username,))
        token = new_token()
        conn.execute(
            "INSERT INTO sessions (token, username, created_at) VALUES (?, ?, ?)", (token, username, now)
        )
        row = conn.execute("SELECT * FROM profiles WHERE username = ?", (username,)).fetchone()
    return {"token": token, "username": username, "profile": row_to_profile(row)}


@app.post("/api/auth/login")
def login(req: LoginRequest, x_app_secret: Optional[str] = Header(default=None)):
    check_secret(x_app_secret)
    username = req.username.strip()
    with get_conn() as conn:
        user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if not user or not verify_password(req.password, user["salt"], user["password_hash"]):
            raise HTTPException(status_code=401, detail="invalid username or password")
        token = new_token()
        conn.execute(
            "INSERT INTO sessions (token, username, created_at) VALUES (?, ?, ?)",
            (token, username, int(time.time())),
        )
        row = conn.execute("SELECT * FROM profiles WHERE username = ?", (username,)).fetchone()
        if not row:
            conn.execute("INSERT OR IGNORE INTO profiles (username) VALUES (?)", (username,))
            row = conn.execute("SELECT * FROM profiles WHERE username = ?", (username,)).fetchone()
    return {"token": token, "username": username, "profile": row_to_profile(row)}


@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization[len("Bearer "):].strip()
        with get_conn() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    return {"ok": True}


# ---------- Classification ----------
@app.post("/api/classify")
async def classify(req: ClassifyRequest, x_app_secret: Optional[str] = Header(default=None)):
    """Classify a photo using the tool-calling agent in the repo root.

    Returns the same five fields the app has always read, plus points,
    where_to_recycle, blue_bin and items - see server/agent_bridge.py.
    """
    check_secret(x_app_secret)

    if req.media_type not in VALID_MEDIA_TYPES:
        raise HTTPException(status_code=400, detail="unsupported media type")

    # The agent makes several blocking API calls, so keep it off the event loop.
    try:
        return await run_in_threadpool(
            agent_bridge.classify, req.image_base64, req.media_type
        )
    except Exception:
        raise HTTPException(status_code=502, detail="classification failed")


# ---------- Profile ----------
@app.get("/api/profile")
def get_my_profile(username: str = Depends(get_current_username)):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM profiles WHERE username = ?", (username,)).fetchone()
    return row_to_profile(row) if row else DEFAULT_PROFILE


@app.put("/api/profile")
def put_my_profile(
    profile: ProfileIn,
    username: str = Depends(get_current_username),
    x_app_secret: Optional[str] = Header(default=None),
):
    check_secret(x_app_secret)
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO profiles
                (username, total_points, current_streak, longest_streak, last_scan_date, total_scans, by_category)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET
                total_points=excluded.total_points,
                current_streak=excluded.current_streak,
                longest_streak=excluded.longest_streak,
                last_scan_date=excluded.last_scan_date,
                total_scans=excluded.total_scans,
                by_category=excluded.by_category
            """,
            (
                username,
                profile.totalPoints,
                profile.currentStreak,
                profile.longestStreak,
                profile.lastScanDate,
                profile.totalScans,
                json.dumps(profile.byCategory),
            ),
        )
    return {"ok": True}


# ---------- Leaderboard ----------
@app.get("/api/leaderboard")
def leaderboard():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT username, total_points FROM profiles ORDER BY total_points DESC LIMIT 100"
        ).fetchall()
    return [{"username": r["username"], "points": r["total_points"]} for r in rows]


@app.get("/api/leaderboard/friends")
def friends_leaderboard(username: str = Depends(get_current_username)):
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT p.username AS username, p.total_points AS total_points
            FROM profiles p
            WHERE p.username = ? OR p.username IN (
                SELECT friend_username FROM friends WHERE username = ?
            )
            ORDER BY p.total_points DESC
            """,
            (username, username),
        ).fetchall()
    return [{"username": r["username"], "points": r["total_points"]} for r in rows]


# ---------- Friends ----------
@app.get("/api/friends")
def list_friends(username: str = Depends(get_current_username)):
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT f.friend_username AS username, COALESCE(p.total_points, 0) AS total_points
            FROM friends f
            LEFT JOIN profiles p ON p.username = f.friend_username
            WHERE f.username = ?
            ORDER BY p.total_points DESC
            """,
            (username,),
        ).fetchall()
    return [{"username": r["username"], "points": r["total_points"]} for r in rows]


@app.post("/api/friends")
def add_friend(
    req: FriendRequest,
    username: str = Depends(get_current_username),
    x_app_secret: Optional[str] = Header(default=None),
):
    check_secret(x_app_secret)
    target = req.username.strip()
    if target == username:
        raise HTTPException(status_code=400, detail="cannot add yourself as a friend")
    with get_conn() as conn:
        exists = conn.execute("SELECT 1 FROM users WHERE username = ?", (target,)).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="no user with that username")
        now = int(time.time())
        conn.execute(
            "INSERT OR IGNORE INTO friends (username, friend_username, created_at) VALUES (?, ?, ?)",
            (username, target, now),
        )
        conn.execute(
            "INSERT OR IGNORE INTO friends (username, friend_username, created_at) VALUES (?, ?, ?)",
            (target, username, now),
        )
    return {"ok": True}


@app.delete("/api/friends/{friend_username}")
def remove_friend(
    friend_username: str,
    username: str = Depends(get_current_username),
    x_app_secret: Optional[str] = Header(default=None),
):
    check_secret(x_app_secret)
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM friends WHERE username = ? AND friend_username = ?", (username, friend_username)
        )
        conn.execute(
            "DELETE FROM friends WHERE username = ? AND friend_username = ?", (friend_username, username)
        )
    return {"ok": True}


# ---------- Posts ----------
def _enrich_post(conn, r, viewer: Optional[str]) -> dict:
    like_count = conn.execute(
        "SELECT COUNT(*) AS c FROM likes WHERE post_id = ?", (r["id"],)
    ).fetchone()["c"]
    comment_count = conn.execute(
        "SELECT COUNT(*) AS c FROM comments WHERE post_id = ?", (r["id"],)
    ).fetchone()["c"]
    liked_by_me = False
    if viewer:
        liked_by_me = bool(
            conn.execute(
                "SELECT 1 FROM likes WHERE post_id = ? AND username = ?", (r["id"], viewer)
            ).fetchone()
        )
    return {
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
        "isGuest": bool(r["is_guest"]),
        "likeCount": like_count,
        "commentCount": comment_count,
        "likedByMe": liked_by_me,
    }


@app.get("/api/posts")
def list_posts(
    limit: int = 50,
    guest_tag: Optional[str] = None,
    username: Optional[str] = Depends(get_optional_username),
):
    viewer = username or guest_display_name(guest_tag)
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM posts ORDER BY ts DESC LIMIT ?", (min(max(limit, 1), 100),)
        ).fetchall()
        result = [_enrich_post(conn, r, viewer) for r in rows]
    return result


@app.get("/api/posts/mine")
def list_my_posts(
    guest_tag: Optional[str] = None,
    username: Optional[str] = Depends(get_optional_username),
):
    """All of the calling identity's own posts, for the calendar view — not just the
    most recent global posts, so a whole month's history is available regardless of
    how active the public feed is."""
    identity = username or guest_display_name(guest_tag)
    if not identity:
        return []
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM posts WHERE username = ? ORDER BY ts DESC LIMIT 500", (identity,)
        ).fetchall()
        result = [_enrich_post(conn, r, identity) for r in rows]
    return result


@app.post("/api/posts")
async def create_post(
    category: str = Form(...),
    item_name: str = Form(...),
    weight_g: int = Form(...),
    co2_g: int = Form(...),
    points: int = Form(...),
    fun_fact: str = Form(""),
    guest_tag: Optional[str] = Form(None),
    image: UploadFile = File(...),
    username: Optional[str] = Depends(get_optional_username),
    x_app_secret: Optional[str] = Header(default=None),
):
    check_secret(x_app_secret)

    is_guest = username is None
    display_name = username if username else format_guest_name(guest_tag)

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
            INSERT INTO posts (id, ts, username, category, item_name, weight_g, co2_g, points, fun_fact, image_path, is_guest)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                post_id, ts, display_name, category, item_name.strip()[:80], weight_g, co2_g,
                points, fun_fact.strip()[:280], filename, int(is_guest),
            ),
        )

    return {
        "id": post_id,
        "ts": ts,
        "username": display_name,
        "category": category,
        "itemName": item_name.strip()[:80],
        "weightG": weight_g,
        "co2G": co2_g,
        "points": points,
        "funFact": fun_fact.strip()[:280],
        "imageUrl": f"/uploads/{filename}",
        "isGuest": is_guest,
        "likeCount": 0,
        "commentCount": 0,
        "likedByMe": False,
    }


# ---------- Likes ----------
@app.post("/api/posts/{post_id}/like")
def toggle_like(
    post_id: str,
    req: GuestIdentity,
    username: Optional[str] = Depends(get_optional_username),
    x_app_secret: Optional[str] = Header(default=None),
):
    check_secret(x_app_secret)
    identity, _ = resolve_identity(username, req.guest_tag)
    with get_conn() as conn:
        exists = conn.execute("SELECT 1 FROM posts WHERE id = ?", (post_id,)).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="post not found")
        already_liked = conn.execute(
            "SELECT 1 FROM likes WHERE post_id = ? AND username = ?", (post_id, identity)
        ).fetchone()
        if already_liked:
            conn.execute("DELETE FROM likes WHERE post_id = ? AND username = ?", (post_id, identity))
            liked = False
        else:
            conn.execute(
                "INSERT INTO likes (post_id, username, created_at) VALUES (?, ?, ?)",
                (post_id, identity, int(time.time())),
            )
            liked = True
        like_count = conn.execute(
            "SELECT COUNT(*) AS c FROM likes WHERE post_id = ?", (post_id,)
        ).fetchone()["c"]
    return {"liked": liked, "likeCount": like_count}


# ---------- Comments ----------
@app.get("/api/posts/{post_id}/comments")
def list_comments(post_id: str):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM comments WHERE post_id = ? ORDER BY ts ASC", (post_id,)
        ).fetchall()
    return [
        {
            "id": r["id"],
            "postId": r["post_id"],
            "username": r["username"],
            "isGuest": bool(r["is_guest"]),
            "text": r["text"],
            "ts": r["ts"],
        }
        for r in rows
    ]


@app.post("/api/posts/{post_id}/comments")
def create_comment(
    post_id: str,
    body: CommentIn,
    username: Optional[str] = Depends(get_optional_username),
    x_app_secret: Optional[str] = Header(default=None),
):
    check_secret(x_app_secret)
    text = body.text.strip()[:280]
    if not text:
        raise HTTPException(status_code=400, detail="comment cannot be empty")
    identity, is_guest = resolve_identity(username, body.guest_tag)

    with get_conn() as conn:
        exists = conn.execute("SELECT 1 FROM posts WHERE id = ?", (post_id,)).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="post not found")
        comment_id = uuid.uuid4().hex
        ts = int(time.time() * 1000)
        conn.execute(
            "INSERT INTO comments (id, post_id, username, is_guest, text, ts) VALUES (?, ?, ?, ?, ?, ?)",
            (comment_id, post_id, identity, int(is_guest), text, ts),
        )

    return {
        "id": comment_id,
        "postId": post_id,
        "username": identity,
        "isGuest": is_guest,
        "text": text,
        "ts": ts,
    }
