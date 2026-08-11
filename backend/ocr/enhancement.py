from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

try:
    import cv2
except Exception:  # pragma: no cover - optional runtime dependency
    cv2 = None


def enhance_image(input_path: Path, output_path: Path) -> dict[str, str]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if cv2 is None:
        return _enhance_with_pillow(input_path, output_path)
    return _enhance_with_opencv(input_path, output_path)


def _enhance_with_pillow(input_path: Path, output_path: Path) -> dict[str, str]:
    image = Image.open(input_path).convert("L")
    image = ImageEnhance.Contrast(image).enhance(1.65)
    image = image.filter(ImageFilter.MedianFilter(size=3))
    image = image.filter(ImageFilter.SHARPEN)
    image.save(output_path)
    return {
        "grayscale": "Pillow grayscale",
        "noise_removal": "Median filter",
        "thresholding": "Contrast stretch",
        "deskew": "Skipped",
        "sharpen": "Applied",
    }


def _enhance_with_opencv(input_path: Path, output_path: Path) -> dict[str, str]:
    image = cv2.imread(str(input_path))
    if image is None:
        raise ValueError("Unable to read uploaded image")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, h=18)
    thresholded = cv2.adaptiveThreshold(
        denoised,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        11,
    )
    deskewed = _deskew(thresholded)
    sharpen_kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    sharpened = cv2.filter2D(deskewed, -1, sharpen_kernel)
    cv2.imwrite(str(output_path), sharpened)

    return {
        "grayscale": "OpenCV grayscale",
        "noise_removal": "Non-local means denoising",
        "thresholding": "Adaptive Gaussian threshold",
        "deskew": "Minimum-area angle correction",
        "sharpen": "Convolution sharpening",
    }


def _deskew(image: np.ndarray) -> np.ndarray:
    coords = np.column_stack(np.where(image < 255))
    if coords.size == 0:
        return image

    angle = cv2.minAreaRect(coords)[-1]
    angle = -(90 + angle) if angle < -45 else -angle
    if abs(angle) < 0.2 or abs(angle) > 12:
        return image

    height, width = image.shape[:2]
    center = (width // 2, height // 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(
        image,
        matrix,
        (width, height),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )
