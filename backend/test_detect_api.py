"""
Test script for IBVAP YOLO Detection Endpoint (POST /api/detect).
Can be run to verify inference on local or synthetic image frames.

Usage:
    python test_detect_api.py
"""

import io
import requests
from PIL import Image, ImageDraw


def create_sample_test_image() -> bytes:
    """Generates a synthetic test image in memory."""
    img = Image.new("RGB", (640, 480), color=(30, 45, 65))
    draw = ImageDraw.Draw(img)
    # Draw a simulated object rectangle
    draw.rectangle([150, 100, 300, 400], outline=(0, 229, 255), width=3)
    draw.text((160, 80), "Simulated Target", fill=(0, 229, 255))

    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_health_endpoint(base_url="http://localhost:8000"):
    print(f"\n[1] Testing Health Endpoint: {base_url}/api/health")
    try:
        res = requests.get(f"{base_url}/api/health", timeout=5)
        print(f"Status: {res.status_code}")
        print("Response:", res.json())
    except Exception as e:
        print(f"Connection failed: {e}")


def test_detect_endpoint(base_url="http://localhost:8000"):
    print(f"\n[2] Testing YOLO Inference Endpoint: {base_url}/api/detect")
    img_bytes = create_sample_test_image()

    files = {"file": ("test_frame.jpg", img_bytes, "image/jpeg")}
    params = {"confidence": 0.40}

    try:
        res = requests.post(f"{base_url}/api/detect", files=files, params=params, timeout=10)
        print(f"Status: {res.status_code}")
        print("Response:", res.json())
    except Exception as e:
        print(f"Inference request failed: {e}")


if __name__ == "__main__":
    print("==================================================")
    print("IBVAP YOLO Inference API Test Client")
    print("==================================================")
    test_health_endpoint()
    test_detect_endpoint()
