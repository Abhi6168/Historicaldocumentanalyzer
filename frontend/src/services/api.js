const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function uploadDocument(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);
  onProgress?.(18);

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData
  });

  onProgress?.(74);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "OCR processing failed");
  }

  const document = await response.json();
  onProgress?.(100);
  return normalizeDocument(document);
}

export async function fetchHistory() {
  const response = await fetch(`${API_BASE}/history`);
  if (!response.ok) throw new Error("Unable to load OCR history");
  const documents = await response.json();
  return documents.map(normalizeDocument);
}

export async function deleteHistoryItem(id) {
  const response = await fetch(`${API_BASE}/history/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Unable to delete document");
}

export function downloadUrl(id, extension) {
  return `${API_BASE}/download/${id}.${extension}`;
}

export function assetUrl(path) {
  if (!path) return "";
  if (path.startsWith("blob:") || path.startsWith("data:") || path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

function normalizeDocument(document) {
  return {
    ...document,
    confidence: Number(document.confidence || 0),
    processing_time: Number(document.processing_time || 0),
    characters: Number(document.characters || document.text?.length || 0),
    words: document.words || scoreWords(document.text || "", Number(document.confidence || 0.86))
  };
}

function scoreWords(text, confidence) {
  return text.split(/\s+/).filter(Boolean).map((word, index) => ({
    word: word.replace(/[.,;:]/g, ""),
    confidence: Math.max(0.42, confidence - (index % 4) * 0.04)
  }));
}
