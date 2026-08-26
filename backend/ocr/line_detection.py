import logging
import os
import cv2
import numpy as np
from pathlib import Path
from typing import Tuple, List, Dict, Any

logger = logging.getLogger("line_detection")
logging.basicConfig(level=logging.INFO)


def detect_and_segment_lines(
    image_path: Path,
    enhanced_path: Path = None,
    output_annotated_path: Path = None,
    debug_dir: Path = None
) -> Tuple[List[Dict[str, Any]], np.ndarray]:
    """
    Detects individual text lines in a document image using Horizontal Projection Profiling (HPP).
    Cleans scanner/screenshot border artifacts, finds natural valley separators between lines,
    crops each line preserving ascenders/descenders, sorts them in reading order (top to bottom),
    and saves an annotated visualization with clear bounding boxes.
    
    Returns:
        lines: List of dicts containing {
            "line_id": int,
            "bbox": [x, y, width, height],
            "crop_bbox": [x1, y1, width, height],
            "crop_image": np.ndarray (BGR)
        }
        annotated_image: np.ndarray (BGR) with drawn bounding boxes and line badges.
    """
    img = cv2.imread(str(image_path))
    if img is None:
        if enhanced_path and Path(enhanced_path).exists():
            img = cv2.imread(str(enhanced_path))
        if img is None:
            raise ValueError(f"Unable to read image at {image_path}")

    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 1. Denoise and threshold
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Determine light vs dark background
    mean_intensity = np.mean(blur)
    if mean_intensity < 100:
        # Dark background with light text
        binary = cv2.adaptiveThreshold(
            blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 25, -4
        )
    else:
        # Standard historical manuscript: Light parchment with dark ink
        _, binary = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # 2. Clean scanner / screenshot border lines (solid horizontal or vertical artifacts at edges)
    cleaned_binary = binary.copy()
    edge_band_y = max(5, int(h * 0.03))
    edge_band_x = max(5, int(w * 0.03))
    
    # Top and bottom margin rows
    for y in range(min(edge_band_y, h)):
        if np.mean(cleaned_binary[y, :] == 255) > 0.35:
            cleaned_binary[y, :] = 0
    for y in range(max(0, h - edge_band_y), h):
        if np.mean(cleaned_binary[y, :] == 255) > 0.35:
            cleaned_binary[y, :] = 0

    # Left and right margin columns
    for x in range(min(edge_band_x, w)):
        if np.mean(cleaned_binary[:, x] == 255) > 0.35:
            cleaned_binary[:, x] = 0
    for x in range(max(0, w - edge_band_x), w):
        if np.mean(cleaned_binary[:, x] == 255) > 0.35:
            cleaned_binary[:, x] = 0
            
    # Remove isolated salt-and-pepper noise
    noise_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    cleaned_binary = cv2.morphologyEx(cleaned_binary, cv2.MORPH_OPEN, noise_kernel)
    
    # 3. Horizontal Projection Profile (HPP)
    proj = np.sum(cleaned_binary > 0, axis=1).astype(float)
    
    # Smooth projection with a 1D Gaussian kernel proportional to expected line height
    sigma = max(min(h * 0.015, 6.0), 2.5)
    ksize = int(sigma * 4) | 1
    kernel_1d = cv2.getGaussianKernel(ksize, sigma)
    smoothed = cv2.filter2D(proj, -1, kernel_1d).flatten()
    
    max_val = float(np.max(smoothed)) if len(smoothed) > 0 else 0.0
    threshold = max(max_val * 0.08, 10.0)
    min_peak_dist = max(int(h * 0.035), 18)
    
    # 4. Detect Peaks (centers of handwritten lines)
    peaks: List[int] = []
    for y in range(1, h - 1):
        if smoothed[y] > threshold and smoothed[y] >= smoothed[y - 1] and smoothed[y] >= smoothed[y + 1]:
            if not peaks:
                peaks.append(y)
            elif (y - peaks[-1]) >= min_peak_dist:
                peaks.append(y)
            elif smoothed[y] > smoothed[peaks[-1]]:
                peaks[-1] = y
                
    logger.info(f"Image {image_path.name} size: ({w}x{h}), detected {len(peaks)} line peak(s): {peaks}")
    
    raw_boxes: List[List[int]] = []
    
    if len(peaks) <= 1:
        # Single line document: find the exact ink bounding box
        active_rows = np.where(smoothed > threshold * 0.35)[0]
        if len(active_rows) > 0:
            y1 = max(0, int(active_rows[0]) - 6)
            y2 = min(h, int(active_rows[-1]) + 6)
            coords = cv2.findNonZero(cleaned_binary[y1:y2, :])
            if coords is not None:
                bx, by, bw, bh = cv2.boundingRect(coords)
                raw_boxes = [[int(bx), int(y1 + by), int(bw), int(bh)]]
        if not raw_boxes:
            raw_boxes = [[0, 0, int(w), int(h)]]
    else:
        # Multi-line document: find valley boundaries between consecutive peaks
        valleys: List[int] = [0]
        for i in range(len(peaks) - 1):
            p1, p2 = peaks[i], peaks[i + 1]
            valley_idx = int(p1 + np.argmin(smoothed[p1:p2 + 1]))
            valleys.append(valley_idx)
        valleys.append(h)
        
        for i in range(len(valleys) - 1):
            y_top = valleys[i]
            y_bottom = valleys[i + 1]
            
            slice_bin = cleaned_binary[y_top:y_bottom, :]
            coords = cv2.findNonZero(slice_bin)
            if coords is not None and len(coords) > 10:
                bx, by, bw, bh = cv2.boundingRect(coords)
                pad_y = max(int(bh * 0.12), 4)
                pad_x = max(int(bw * 0.02), 4)
                
                final_y = max(0, int(y_top + by - pad_y))
                final_h = min(h - final_y, int(bh + 2 * pad_y))
                final_x = max(0, int(bx - pad_x))
                final_w = min(w - final_x, int(bw + 2 * pad_x))
                
                raw_boxes.append([final_x, final_y, final_w, final_h])
            else:
                # Fallback: slice region itself if coordinates sparse
                raw_boxes.append([0, y_top, w, y_bottom - y_top])
                
        if not raw_boxes:
            raw_boxes = [[0, 0, int(w), int(h)]]

    # 5. Strict Top-to-Bottom Reading Order Sorting
    raw_boxes.sort(key=lambda b: (b[1] + b[3] / 2))
    
    # 6. Crop lines and generate visual annotations
    lines: List[Dict[str, Any]] = []
    annotated_img = img.copy()
    
    # Gold/amber border for detected lines
    box_color = (55, 175, 212)
    text_bg_color = (30, 120, 160)
    
    debug_path = Path(debug_dir) if debug_dir else (Path(output_annotated_path).parent.parent / "outputs" / "debug" if output_annotated_path else None)
    if debug_path:
        debug_path.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(debug_path / "original.png"), img)
        if enhanced_path and Path(enhanced_path).exists():
            enh_img = cv2.imread(str(enhanced_path))
            if enh_img is not None:
                cv2.imwrite(str(debug_path / "enhanced.png"), enh_img)

    for idx, (x, y, bw, bh) in enumerate(raw_boxes, start=1):
        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(w, x + bw)
        y2 = min(h, y + bh)
        
        crop_roi = img[y1:y2, x1:x2]
        
        lines.append({
            "line_id": idx,
            "bbox": [int(x1), int(y1), int(x2 - x1), int(y2 - y1)],
            "crop_bbox": [int(x1), int(y1), int(x2 - x1), int(y2 - y1)],
            "crop_image": crop_roi
        })
        
        # Save individual debug line crop
        if debug_path:
            cv2.imwrite(str(debug_path / f"line_{idx:03d}.png"), crop_roi)
        
        # Draw bounding box
        cv2.rectangle(annotated_img, (x1, y1), (x2, y2), box_color, 2)
        
        # Draw line number badge
        label = f"Line {idx}"
        (label_w, label_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        badge_y1 = max(0, y1 - label_h - 6)
        badge_y2 = y1
        badge_x1 = x1
        badge_x2 = x1 + label_w + 8
        
        cv2.rectangle(annotated_img, (badge_x1, badge_y1), (badge_x2, badge_y2), text_bg_color, -1)
        cv2.putText(
            annotated_img,
            label,
            (badge_x1 + 4, badge_y2 - 3),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (255, 255, 255),
            1,
            cv2.LINE_AA
        )
        
    # Save annotated image if path provided
    if output_annotated_path:
        output_annotated_path = Path(output_annotated_path)
        output_annotated_path.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(output_annotated_path), annotated_img)
        
    if debug_path:
        cv2.imwrite(str(debug_path / "segmented.png"), annotated_img)
        
    logger.info(f"Finished line segmentation: {len(lines)} line(s) detected and annotated.")
    return lines, annotated_img
