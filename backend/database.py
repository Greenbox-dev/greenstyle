import os
import sqlite3
from pathlib import Path

DATABASE_PATH = os.environ.get("DATABASE_PATH", str(Path(__file__).resolve().parent.parent / "instance" / "financeiro.db"))

def get_db():
    Path(DATABASE_PATH).parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection

def init_db():
    with get_db() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            value_cents INTEGER NOT NULL CHECK(value_cents > 0),
            type TEXT NOT NULL CHECK(type IN ('entrada','despesa')),
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS wishes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            value_cents INTEGER NOT NULL CHECK(value_cents > 0),
            priority TEXT NOT NULL CHECK(priority IN ('Baixa','Média','Alta')),
            done INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        """)
