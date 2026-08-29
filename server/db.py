import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "app.db"))


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS friends (
                username TEXT NOT NULL,
                friend_username TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                PRIMARY KEY (username, friend_username)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS profiles (
                username TEXT PRIMARY KEY,
                total_points INTEGER NOT NULL DEFAULT 0,
                current_streak INTEGER NOT NULL DEFAULT 0,
                longest_streak INTEGER NOT NULL DEFAULT 0,
                last_scan_date TEXT,
                total_scans INTEGER NOT NULL DEFAULT 0,
                by_category TEXT NOT NULL DEFAULT '{}'
            )
            """
        )
        _ensure_column(conn, "profiles", "avatar_path", "TEXT")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS posts (
                id TEXT PRIMARY KEY,
                ts INTEGER NOT NULL,
                username TEXT NOT NULL,
                category TEXT NOT NULL,
                item_name TEXT NOT NULL,
                weight_g INTEGER NOT NULL,
                co2_g INTEGER NOT NULL,
                points INTEGER NOT NULL,
                fun_fact TEXT,
                image_path TEXT,
                is_guest INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        _ensure_column(conn, "posts", "is_guest", "INTEGER NOT NULL DEFAULT 0")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS likes (
                post_id TEXT NOT NULL,
                username TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                PRIMARY KEY (post_id, username)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS comments (
                id TEXT PRIMARY KEY,
                post_id TEXT NOT NULL,
                username TEXT NOT NULL,
                is_guest INTEGER NOT NULL DEFAULT 0,
                text TEXT NOT NULL,
                ts INTEGER NOT NULL
            )
            """
        )


def _ensure_column(conn, table, column, decl):
    cols = {row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")


@contextmanager
def get_conn():
    conn = _connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
