import argparse
import os
import sys
from pathlib import Path
import cv2

# Set path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from ocr.enhancement import enhance_image
from ocr.line_detection import detect_and_segment_lines
from ocr.model import ocr_model


def debug_image(image_path: Path, output_debug_dir: Path = None) -> dict:
    if output_debug_dir is None:
        output_debug_dir = ROOT / "outputs" / "debug"
    output_debug_dir.mkdir(parents=True, exist_ok=True)

    img = cv2.imread(str(image_path))
    if img is None:
        print(f"Error: Unable to load image at {image_path}")
        return {}

    h, w = img.shape[:2]
    print("================================================================")
    print(f"HISTORICAL DOCUMENT ANALYZER - DEBUG OCR RUNNER")
    print(f"Image: {image_path.name}")
    print(f"Dimensions: {w}w x {h}h")
    print(f"TrOCR Model: {ocr_model.model_name}")
    print("================================================================\n")

    enhanced_path = output_debug_dir / "enhanced.png"
    annotated_path = output_debug_dir / "segmented.png"

    # 1. Enhancement
    enhance_image(image_path, enhanced_path)

    # 2. Line Segmentation & Cropping
    detected_lines, annotated_img = detect_and_segment_lines(
        image_path,
        enhanced_path=enhanced_path,
        output_annotated_path=annotated_path,
        debug_dir=output_debug_dir
    )

    print(f"Total detected lines: {len(detected_lines)}\n")

    # 3. TrOCR Inference
    prediction = ocr_model.predict(image_path, detected_lines=detected_lines)

    for line in prediction["lines"]:
        line_id = line["line_id"]
        bbox = line["bbox"]
        text = line["text"]
        conf = line["confidence"]
        crop_h = bbox[3]
        crop_w = bbox[2]
        print(f"----------------------------------------------------------------")
        print(f"LINE {line_id}")
        print(f"bbox: {bbox} (x={bbox[0]}, y={bbox[1]}, w={crop_w}, h={crop_h})")
        print(f"crop file: outputs/debug/line_{line_id:03d}.png")
        print(f"OCR: {text}")
        print(f"Confidence: {conf:.1%}")
        print(f"----------------------------------------------------------------")

    print("\n================================================================")
    print("FINAL RECONSTRUCTED OUTPUT")
    print("================================================================")
    print(prediction["text"])
    print("================================================================")
    print(f"Overall Document Confidence: {prediction['confidence']:.1%}")
    print(f"Processing Time: {prediction['processing_time']}s")
    print(f"Debug images saved to: {output_debug_dir}")
    print("================================================================\n")

    return prediction


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Debug OCR Pipeline on a Document Image")
    parser.add_argument(
        "image_path",
        nargs="?",
        default=str(ROOT / "uploads" / "dd9ac070-1bbe-4f93-a00b-d5b31185b91e.png"),
        help="Path to image file"
    )
    args = parser.parse_args()
    debug_image(Path(args.image_path))

