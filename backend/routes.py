import json
import shutil
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

_BACKEND_DIR = Path(__file__).resolve().parent
_ROOT_DIR = _BACKEND_DIR.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))
if str(_ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(_ROOT_DIR))

try:
    from database import delete_document, insert_document, list_documents
    from ocr.enhancement import enhance_image
    from ocr.line_detection import detect_and_segment_lines
    from ocr.model import ocr_model
except ImportError:
    from backend.database import delete_document, insert_document, list_documents
    from backend.ocr.enhancement import enhance_image
    from backend.ocr.line_detection import detect_and_segment_lines
    from backend.ocr.model import ocr_model

ROOT = _ROOT_DIR
UPLOAD_DIR = ROOT / "uploads"
HISTORY_DIR = ROOT / "history"
OUTPUT_DIR = ROOT / "outputs"
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tiff", ".tif"}

router = APIRouter()


@router.post("/upload")
async def upload(file: UploadFile = File(...)) -> dict:
    return await _process_upload(file)


@router.post("/predict")
async def predict(file: UploadFile = File(...)) -> dict:
    return await _process_upload(file)


@router.get("/history")
def history() -> list[dict]:
    return list_documents()


@router.delete("/history/{document_id}")
def remove_history(document_id: str) -> dict[str, str]:
    if not delete_document(document_id):
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "deleted", "id": document_id}


@router.get("/download/{document_id}.{extension}")
def download(document_id: str, extension: str) -> FileResponse:
    document = next((item for item in list_documents() if item["id"] == document_id), None)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    extension = extension.lower()
    if extension not in {"txt", "json", "pdf"}:
        raise HTTPException(status_code=400, detail="Unsupported export format")

    output_path = OUTPUT_DIR / f"{document_id}.{extension}"
    if extension == "txt":
        output_path.write_text(document["text"], encoding="utf-8")
    elif extension == "json":
        output_path.write_text(json.dumps(document, indent=2), encoding="utf-8")
    else:
        _write_pdf(output_path, document)

    return FileResponse(output_path, filename=output_path.name)


async def _process_upload(file: UploadFile) -> dict:
    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Supported formats: PNG, JPG, JPEG, TIFF. Please upload a valid document image."
        )

    document_id = str(uuid.uuid4())
    safe_name = f"{document_id}{extension}"
    original_path = UPLOAD_DIR / safe_name
    enhanced_path = HISTORY_DIR / f"{document_id}-enhanced.png"
    annotated_path = HISTORY_DIR / f"{document_id}-annotated.png"

    try:
        with original_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {exc}")

    try:
        # Step 1: Image Enhancement
        steps = enhance_image(original_path, enhanced_path)
    except Exception as exc:
        steps = {"status": f"Enhancement fallback: {exc}"}
        if not enhanced_path.exists():
            shutil.copy(original_path, enhanced_path)

    try:
        # Step 2 & 3: Line Detection, Ordering, and Bounding Box Annotation
        detected_lines, _ = detect_and_segment_lines(
            original_path,
            enhanced_path=enhanced_path,
            output_annotated_path=annotated_path
        )
    except Exception as exc:
        detected_lines = []
        if not annotated_path.exists() and enhanced_path.exists():
            shutil.copy(enhanced_path, annotated_path)

    # Step 4 & 5: Run TrOCR on all detected lines
    prediction = ocr_model.predict(enhanced_path, detected_lines=detected_lines)
    now = datetime.now(timezone.utc).isoformat()

    steps["line_detection"] = f"Detected and ordered {prediction['num_lines']} line(s)"

    document = {
        "id": document_id,
        "filename": file.filename or safe_name,
        "original_url": f"/files/uploads/{safe_name}",
        "enhanced_url": f"/files/history/{document_id}-enhanced.png",
        "annotated_url": f"/files/history/{document_id}-annotated.png",
        "num_lines": prediction["num_lines"],
        "lines": prediction["lines"],
        "text": prediction["text"],
        "full_text": prediction["full_text"],
        "confidence": prediction["confidence"],
        "processing_time": prediction["processing_time"],
        "characters": len(str(prediction["text"])),
        "created_at": now,
        "model": prediction["model"],
        "words": prediction["words"],
        "pipeline": steps,
    }
    
    insert_document(document)
    return document


def _write_pdf(path: Path, document: dict) -> None:
    pdf = canvas.Canvas(str(path), pagesize=letter)
    width, height = letter
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(72, height - 72, "Historical Document Analyzer")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(72, height - 94, f"Document: {document['filename']}")
    pdf.drawString(72, height - 110, f"Model-generated OCR Prediction | Lines: {document.get('num_lines', 1)}")
    pdf.setFont("Helvetica", 12)
    
    y_pos = height - 150
    text_content = str(document["text"]).splitlines() or [str(document["text"])]
    for line in text_content:
        if y_pos < 72:
            pdf.showPage()
            pdf.setFont("Helvetica", 12)
            y_pos = height - 72
        pdf.drawString(72, y_pos, line[:95])
        y_pos -= 18
        
    pdf.save()
