"""
Test script for IBVAP Automatic Number Plate Recognition (ANPR) API.
Demonstrates:
1. End-to-end flow: Image -> Vehicle Detection -> Plate Detection -> Preprocessing -> OCR
2. Graceful edge-case handling (empty/no-vehicle frame)
3. Testing POST /api/anpr endpoint

Usage:
    python test_anpr_api.py
"""

import io
import requests
from PIL import Image, ImageDraw, ImageFont


def create_sample_vehicle_with_plate_image() -> bytes:
    """Generates a synthetic frame depicting a vehicle with a license plate."""
    # 640x480 frame with vehicle body
    img = Image.new("RGB", (640, 480), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)

    # Vehicle body rectangle [100, 120, 540, 400]
    draw.rectangle([100, 120, 540, 400], fill=(40, 60, 90), outline=(0, 229, 255), width=2)
    draw.text((120, 130), "CAR #01", fill=(0, 229, 255))

    # License plate rectangle [220, 310, 420, 370]
    draw.rectangle([220, 310, 420, 370], fill=(245, 245, 245), outline=(0, 0, 0), width=3)
    # License plate text
    draw.text((245, 330), "TN09AB1234", fill=(0, 0, 0))

    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def create_empty_frame_image() -> bytes:
    """Generates a scenery frame with no vehicles."""
    img = Image.new("RGB", (640, 480), color=(10, 15, 25))
    draw = ImageDraw.Draw(img)
    draw.text((200, 240), "Perimeter Fence - No Vehicle", fill=(100, 116, 139))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_anpr_preprocessing_local():
    """Direct in-memory test of ANPR plate preprocessing and normalization."""
    print("\n==================================================")
    print("[1] Testing ANPR Preprocessing & Normalization")
    print("==================================================")

    from anpr.ocr_engine import preprocess_plate_image, normalize_plate_text

    # Test text normalization
    raw_sample = " tn 09 - ab . 1234 \n"
    normalized = normalize_plate_text(raw_sample)
    print(f"Raw OCR Output:        '{raw_sample.strip()}'")
    print(f"Normalized Output:     '{normalized}'")
    assert normalized == "TN09AB1234", "Normalization must produce uppercase alphanumeric string"
    print("SUCCESS: Plate text normalization passed.")

    # Test image preprocessing
    sample_plate = Image.new("RGB", (200, 60), color=(250, 250, 250))
    processed = preprocess_plate_image(sample_plate)
    print(f"Preprocessed image array shape: {processed.shape}")
    assert len(processed.shape) == 3, "Preprocessed image must be 3-channel array"
    print("SUCCESS: CCTV image preprocessing pipeline executed cleanly.")


def test_anpr_api_http(base_url="http://localhost:8000"):
    """Tests the HTTP POST /api/anpr endpoint."""
    print("\n==================================================")
    print(f"[2] Testing HTTP Endpoint: {base_url}/api/anpr")
    print("==================================================")

    vehicle_frame = create_sample_vehicle_with_plate_image()
    files = {"file": ("vehicle_cctv_frame.jpg", vehicle_frame, "image/jpeg")}

    try:
        res = requests.post(f"{base_url}/api/anpr", files=files, timeout=10)
        print(f"Vehicle Frame Status: {res.status_code}")
        print("Vehicle Frame Response:", res.json())
    except Exception as e:
        print(f"HTTP test skipped (server may not be running): {e}")

    # Test edge case: frame with no vehicle
    empty_frame = create_empty_frame_image()
    files_empty = {"file": ("empty_frame.jpg", empty_frame, "image/jpeg")}
    try:
        res2 = requests.post(f"{base_url}/api/anpr", files=files_empty, timeout=10)
        print(f"\nNo-Vehicle Frame Status: {res2.status_code}")
        print("No-Vehicle Frame Response:", res2.json())
    except Exception as e:
        pass


if __name__ == "__main__":
    test_anpr_preprocessing_local()
    test_anpr_api_http()
