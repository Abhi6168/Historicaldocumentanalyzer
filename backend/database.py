import sqlite3
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "history" / "history.sqlite3"


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                original_url TEXT NOT NULL,
                enhanced_url TEXT NOT NULL,
                text TEXT NOT NULL,
                confidence REAL NOT NULL,
                processing_time REAL NOT NULL,
                characters INTEGER NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


def insert_document(document: dict[str, Any]) -> None:
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO documents (
                id, filename, original_url, enhanced_url, text, confidence,
                processing_time, characters, created_at
            ) VALUES (
                :id, :filename, :original_url, :enhanced_url, :text, :confidence,
                :processing_time, :characters, :created_at
            )
            """,
            document,
        )


def list_documents() -> list[dict[str, Any]]:
    with connect() as connection:
        rows = connection.execute(
            "SELECT * FROM documents ORDER BY created_at DESC"
        ).fetchall()
    return [dict(row) for row in rows]


def delete_document(document_id: str) -> bool:
    with connect() as connection:
        cursor = connection.execute("DELETE FROM documents WHERE id = ?", (document_id,))
        return cursor.rowcount > 0
