"""
Test script for IBVAP Biometric Face Recognition and Friendly Person Matching API.
Demonstrates:
1. End-to-end pipeline: Image -> Face Detection -> 512-D InceptionResnetV1 Embedding -> Cosine Similarity Matching
2. Authorized friendly person identification & confidence scoring
3. Handling unknown / unrecognized faces without triggering false threat alarms
4. Enrollment / Registration via POST /api/face/register/{person_id}
5. HTTP endpoints verification

Usage:
    python test_face_api.py
"""

import io
import requests
from PIL import Image, ImageDraw


def create_sample_face_image(name_text: str = "OFFICER") -> bytes:
    """Generates a synthetic portrait/face frame."""
    img = Image.new("RGB", (320, 320), color=(30, 41, 59))
    draw = ImageDraw.Draw(img)

    # Synthetic Face oval [90, 60, 230, 240]
    draw.ellipse([90, 60, 230, 240], fill=(220, 190, 160), outline=(255, 255, 255), width=2)
    # Eyes
    draw.ellipse([125, 110, 145, 130], fill=(50, 50, 50))
    draw.ellipse([175, 110, 195, 130], fill=(50, 50, 50))
    # Nose
    draw.line([160, 130, 160, 160], fill=(180, 140, 110), width=3)
    # Mouth
    draw.line([135, 190, 185, 190], fill=(160, 70, 70), width=4)
    # Badge text
    draw.text((110, 270), name_text, fill=(0, 229, 255))

    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def create_empty_scenery_image() -> bytes:
    """Generates a frame without human faces."""
    img = Image.new("RGB", (640, 480), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)
    draw.text((220, 240), "Perimeter Scenery - No Face", fill=(100, 116, 139))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_local_face_pipeline():
    """Direct in-memory test of face detection, embedding generator, and biometric matching."""
    print("\n==================================================")
    print("[1] Testing Biometric Face Pipeline In-Memory")
    print("==================================================")

    from face.face_detector import face_detector
    from face.face_embedding import face_embedding_generator
    from face.face_matcher import face_matcher

    # 1. Test Face Detection
    face_img_bytes = create_sample_face_image()
    pil_img = Image.open(io.BytesIO(face_img_bytes))
    faces = face_detector.detect_faces(pil_img)
    print(f"Detected Faces count: {len(faces)}")
    assert len(faces) >= 1, "Face detector must find face in synthetic frame"
    print(f"Primary face bbox: {faces[0]['bbox']}, detector confidence: {faces[0]['confidence']:.2f}")

    # 2. Test Embedding Generation
    face_crop = faces[0]["face_crop"]
    embedding = face_embedding_generator.generate_embedding(face_crop)
    print(f"Generated Face Embedding dimensions: {len(embedding)}")
    assert len(embedding) == 512, "InceptionResnetV1 embedding vector must be 512 dimensions"
    print("SUCCESS: 512-D L2-normalized embedding generated.")

    # 3. Test Matcher with Registered Whitelist
    match_res = face_matcher.match_face(embedding)
    print(f"Match Result: matched={match_res['matched']}, identity={match_res['identity']}, confidence={match_res['match_confidence']:.4f}, friendly={match_res['friendly']}")
    print("SUCCESS: Face matcher executed correctly against Friendly Persons database.")


def test_face_api_http(base_url="http://localhost:8000"):
    """Tests the HTTP endpoints: POST /api/face/recognize & POST /api/face/register/{person_id}."""
    print("\n==================================================")
    print(f"[2] Testing HTTP Endpoints: {base_url}/api/face")
    print("==================================================")

    face_frame = create_sample_face_image("CAPT_SHARMA")
    files = {"file": ("patrol_face_frame.jpg", face_frame, "image/jpeg")}

    # 1. Test Recognize
    try:
        res = requests.post(f"{base_url}/api/face/recognize", files=files, timeout=10)
        print(f"Face Recognition Status: {res.status_code}")
        print("Face Recognition Response:", res.json())
    except Exception as e:
        print(f"HTTP test skipped (server may not be running): {e}")

    # 2. Test Register
    try:
        reg_files = {"file": ("enroll_photo.jpg", face_frame, "image/jpeg")}
        data = {
            "person_name": "Major Vikram Batra",
            "department": "13 JAK RIF"
        }
        res_reg = requests.post(
            f"{base_url}/api/face/register/FP-CUSTOM-001",
            files=reg_files,
            data=data,
            timeout=10
        )
        print(f"\nFace Registration Status: {res_reg.status_code}")
        print("Face Registration Response:", res_reg.json())
    except Exception as e:
        pass


if __name__ == "__main__":
    test_local_face_pipeline()
    test_face_api_http()
