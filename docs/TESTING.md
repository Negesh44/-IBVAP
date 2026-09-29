# IBVAP — Testing & Verification Guide

**Platform**: Intelligent Border Video Analytics Platform (IBVAP)  
**Document Version**: 1.0.0  
**Test Automation Framework**: Python `unittest` + FastAPI `TestClient` + Vite Build Engine  

---

## 1. Test Suite Summary

The IBVAP testing harness comprises unit test modules, security and RBAC validation suites, system health and fallback tests, and a 10-stage end-to-end integration test.

| Test Module | Tests | Focus Area | Status |
| :--- | :---: | :--- | :---: |
| **`test_integration_e2e.py`** | 10 | 10-Stage Pipeline (Ingestion $\to$ YOLO $\to$ Tracker $\to$ Events $\to$ WebSocket) | **PASS** |
| **`test_security.py`** | 9 | JWT auth, 401/403 RBAC, file upload magic bytes, camera ID injection, headers | **PASS** |
| **`test_system_health.py`** | 5 | Hardware GPU telemetry, GPU-less fallback, zero-camera fleet, cold start | **PASS** |
| **`test_workflow.py`** | 4 | Realtime evidence storage, signed tokens, alert lifecycle & audit logging | **PASS** |
| **`test_streaming_pipeline.py`**| 4 | Multi-threaded `CameraWorker`, RTSP capture, 5 FPS rate limiter | **PASS** |
| **`test_event_engine.py`** | 5 | Virtual fence polygon intrusion, loitering dwell, night luminance rules | **PASS** |
| **`test_face_api.py`** | 4 | FaceNet InceptionResnetV1 512-D embedding extraction & cosine matcher | **PASS** |
| **`test_anpr_api.py`** | 4 | Vehicle ROI crop, morphology enhancement, PaddleOCR normalization | **PASS** |

---

## 2. Running Automated Tests

### 2.1 Run All Backend Test Suites
```powershell
cd backend
python -m unittest discover -s . -p "test_*.py"
```

### 2.2 Run End-to-End Integration Test
```powershell
cd backend
python test_integration_e2e.py
```
**Expected Output**:
```
[STEP 1] PASS: FastAPI Backend started & health check verified.
[STEP 2] PASS: YOLO loader ready on device [cuda:0/cpu], model path: /app/models/best.pt
[STEP 3] PASS: Video file opened successfully: sample_feed.mp4
[STEP 4] PASS: Frame captured with shape (480, 640, 3)
[STEP 5] PASS: YOLO detection pipeline executed (detections parsed: X)
[STEP 6] PASS: ByteTrack assigned persistent track_id: 102
[STEP 7] PASS: Event Engine processed tracks (security events triggered: X)
[STEP 8] PASS: Supabase status: CONNECTED/LOCAL_FALLBACK (4 cameras accessible)
[STEP 9] PASS: WebSocket endpoint (/ws/live/DEMO-001) connected and accepted client.
[STEP 10] PASS: All 10 React REST and diagnostic test endpoints returned HTTP 200 OK.

Ran 10 tests in 3.8s
OK
```

### 2.3 Run Security & RBAC Test Suite
```powershell
cd backend
python test_security.py
```

### 2.4 Frontend Production Build Verification
```powershell
npm run build
```
**Expected Output**:
```
✓ 3019 modules transformed.
dist/index.html                   1.74 kB │ gzip:   0.83 kB
dist/assets/index-BqCidUhU.css   63.20 kB │ gzip:  10.46 kB
dist/assets/index-IE1HWSko.js   815.99 kB │ gzip: 210.47 kB
✓ built in ~6.5s
```
