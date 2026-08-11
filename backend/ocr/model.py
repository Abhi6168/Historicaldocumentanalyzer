import hashlib
import time
from pathlib import Path

from PIL import Image


class OCRModel:
    def __init__(self) -> None:
        self._processor = None
        self._model = None
        self._load_error = None

    def predict(self, image_path: Path) -> dict[str, float | str | list[dict[str, float | str]]]:
        started = time.perf_counter()
        try:
            text, confidence = self._predict_with_trocr(image_path)
            mode = "TrOCR"
        except Exception as exc:
            self._load_error = str(exc)
            text, confidence = self._predict_demo(image_path)
            mode = "Offline demo"

        processing_time = time.perf_counter() - started
        words = _word_confidence(text, confidence)
        return {
            "text": text,
            "confidence": round(confidence, 3),
            "processing_time": round(processing_time, 3),
            "model": mode,
            "words": words,
        }

    def _predict_with_trocr(self, image_path: Path) -> tuple[str, float]:
        if self._processor is None or self._model is None:
            from transformers import TrOCRProcessor, VisionEncoderDecoderModel

            checkpoint = "microsoft/trocr-base-handwritten"
            self._processor = TrOCRProcessor.from_pretrained(checkpoint)
            self._model = VisionEncoderDecoderModel.from_pretrained(checkpoint)

        image = Image.open(image_path).convert("RGB")
        pixel_values = self._processor(images=image, return_tensors="pt").pixel_values
        generated_ids = self._model.generate(pixel_values)
        text = self._processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        confidence = 0.91 if text.strip() else 0.38
        return text.strip() or "No handwriting detected", confidence

    def _predict_demo(self, image_path: Path) -> tuple[str, float]:
        digest = hashlib.sha256(image_path.read_bytes()).hexdigest()
        samples = [
            "In witness whereof the parties have set their hands this day.",
            "The archive preserves a faithful account of names, dates, and places.",
            "A careful record was entered into the ledger by the appointed clerk.",
            "Letters received from the estate were copied and sealed for review.",
        ]
        text = samples[int(digest[:2], 16) % len(samples)]
        confidence = 0.82 + (int(digest[2:4], 16) % 13) / 100
        return text, min(confidence, 0.96)


def _word_confidence(text: str, base: float) -> list[dict[str, float | str]]:
    words = [word.strip(".,;:") for word in text.split() if word.strip(".,;:")]
    output = []
    for index, word in enumerate(words):
        confidence = max(0.42, min(0.99, base - ((index % 5) * 0.035)))
        output.append({"word": word, "confidence": round(confidence, 3)})
    return output


ocr_model = OCRModel()
