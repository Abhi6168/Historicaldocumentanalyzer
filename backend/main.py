import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

_BACKEND_DIR = Path(__file__).resolve().parent
_ROOT_DIR = _BACKEND_DIR.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))
if str(_ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(_ROOT_DIR))

try:
    from database import init_db
    from routes import router
except ImportError:
    from backend.database import init_db
    from backend.routes import router

ROOT = _ROOT_DIR
UPLOAD_DIR = ROOT / "uploads"
HISTORY_DIR = ROOT / "history"
OUTPUT_DIR = ROOT / "outputs"

for directory in (UPLOAD_DIR, HISTORY_DIR, OUTPUT_DIR):
    directory.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Historical Document Analyzer API",
    description="FastAPI backend for manuscript enhancement, TrOCR inference, and OCR history.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/files/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/files/history", StaticFiles(directory=str(HISTORY_DIR)), name="history")
app.mount("/files/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")


@app.on_event("startup")
def startup() -> None:
    init_db()


app.include_router(router)


@app.get("/")
def health() -> dict[str, str]:
    return {"status": "ready", "service": "Historical Document Analyzer API"}
