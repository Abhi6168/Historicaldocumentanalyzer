import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "history" / "history.sqlite3"
_initialized = False


def connect() -> sqlite3.Connection:
    global _initialized
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    if not _initialized:
        _ensure_schema(connection)
        _initialized = True
    return connection


def _ensure_schema(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            original_url TEXT NOT NULL,
            enhanced_url TEXT NOT NULL,
            annotated_url TEXT,
            text TEXT NOT NULL,
            confidence REAL NOT NULL,
            processing_time REAL NOT NULL,
            characters INTEGER NOT NULL,
            num_lines INTEGER DEFAULT 1,
            lines_json TEXT,
            created_at TEXT NOT NULL
        )
        """
    )
    # Migrate existing schema if columns are missing
    existing_cols = {col[1] for col in connection.execute("PRAGMA table_info(documents)").fetchall()}
    if "annotated_url" not in existing_cols:
        connection.execute("ALTER TABLE documents ADD COLUMN annotated_url TEXT")
    if "num_lines" not in existing_cols:
        connection.execute("ALTER TABLE documents ADD COLUMN num_lines INTEGER DEFAULT 1")
    if "lines_json" not in existing_cols:
        connection.execute("ALTER TABLE documents ADD COLUMN lines_json TEXT")
    connection.commit()


def init_db() -> None:
    with connect() as connection:
        _ensure_schema(connection)


def insert_document(document: Dict[str, Any]) -> None:
    doc_copy = dict(document)
    
    # Extract / format lines_json
    lines = doc_copy.get("lines") or []
    lines_json = json.dumps(lines) if lines else None
    
    params = {
        "id": doc_copy["id"],
        "filename": doc_copy["filename"],
        "original_url": doc_copy["original_url"],
        "enhanced_url": doc_copy["enhanced_url"],
        "annotated_url": doc_copy.get("annotated_url") or doc_copy["enhanced_url"],
        "text": doc_copy["text"],
        "confidence": doc_copy["confidence"],
        "processing_time": doc_copy["processing_time"],
        "characters": doc_copy.get("characters") or len(str(doc_copy["text"])),
        "num_lines": doc_copy.get("num_lines") or (len(lines) if lines else 1),
        "lines_json": lines_json,
        "created_at": doc_copy["created_at"],
    }
    
    with connect() as connection:
        connection.execute(
            """
            INSERT OR REPLACE INTO documents (
                id, filename, original_url, enhanced_url, annotated_url, text, confidence,
                processing_time, characters, num_lines, lines_json, created_at
            ) VALUES (
                :id, :filename, :original_url, :enhanced_url, :annotated_url, :text, :confidence,
                :processing_time, :characters, :num_lines, :lines_json, :created_at
            )
            """,
            params,
        )


def list_documents() -> List[Dict[str, Any]]:
    with connect() as connection:
        rows = connection.execute(
            "SELECT * FROM documents ORDER BY created_at DESC"
        ).fetchall()
        
    results = []
    for row in rows:
        item = dict(row)
        lines_raw = item.get("lines_json")
        if lines_raw:
            try:
                item["lines"] = json.loads(lines_raw)
            except Exception:
                item["lines"] = []
        else:
            item["lines"] = [{
                "line_id": 1,
                "bbox": [0, 0, 0, 0],
                "text": item.get("text", ""),
                "confidence": item.get("confidence", 0.9)
            }]
        item["num_lines"] = item.get("num_lines") or len(item["lines"])
        results.append(item)
    return results


def delete_document(document_id: str) -> bool:
    with connect() as connection:
        cursor = connection.execute("DELETE FROM documents WHERE id = ?", (document_id,))
        return cursor.rowcount > 0
