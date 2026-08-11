# Historical Document Analyzer

Professional AI OCR platform for historical handwritten manuscripts.

## Project Layout

```text
frontend/   React, Tailwind, Framer Motion UI
backend/    FastAPI OCR API, OpenCV enhancement, TrOCR adapter
models/     Local model cache or fine-tuned checkpoints
uploads/    Uploaded source documents
history/    SQLite database and processed images
outputs/    Exported OCR results
```

## Run The Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The backend will use `microsoft/trocr-base-handwritten` when `torch` and `transformers`
are installed and model weights are available. If not, it returns a deterministic demo
prediction so the product experience remains usable offline.

For live TrOCR inference, install the optional ML dependencies:

```powershell
pip install -r requirements-ml.txt
```

## Run The Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

## IAM Dataset

The referenced `archive.zip` contains IAM handwriting word images and `words.txt`.
Use it for fine-tuning or evaluation scripts in `models/`; the production API expects
a trained TrOCR checkpoint or falls back to the public handwritten TrOCR model.
