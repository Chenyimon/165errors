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
            CREATE TABLE IF NOT EXISTS profiles (
                device_id TEXT PRIMARY KEY,
                username TEXT,
                total_points INTEGER NOT NULL DEFAULT 0,
                current_streak INTEGER NOT NULL DEFAULT 0,
                longest_streak INTEGER NOT NULL DEFAULT 0,
                last_scan_date TEXT,
                total_scans INTEGER NOT NULL DEFAULT 0,
                by_category TEXT NOT NULL DEFAULT '{}'
            )
            """
        )
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
                image_path TEXT
            )
            """
        )


@contextmanager
def get_conn():
    conn = _connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
