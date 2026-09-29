# IBVAP — FastAPI REST & WebSocket API Documentation

**Platform**: Intelligent Border Video Analytics Platform (IBVAP)  
**Base URL**: `http://localhost:8000` (or configured `VITE_API_BASE_URL`)  
**WebSocket URL**: `ws://localhost:8000` (or configured `VITE_WS_BASE_URL`)  
**Interactive OpenAPI UI**: [http://localhost:8000/docs](http://localhost:8000/docs)  
**Document Version**: 1.0.0  

---

## 1. Authentication & Security Headers

### Bearer Token Header
Protected endpoints require an HTTP `Authorization` header containing a valid Supabase JWT Bearer token:
```http
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
```

### Role-Based Access Control (RBAC) Requirements
- **`PUBLIC`**: No authentication required (Container health checks, root info).
- **`AUTHENTICATED`**: Any valid user (`ADMIN`, `COMMANDER`, `OPERATOR`, `VIEWER`).
- **`OPERATOR+`**: `OPERATOR`, `COMMANDER`, or `ADMIN`.
- **`COMMANDER+`**: `COMMANDER` or `ADMIN`.
- **`ADMIN`**: `ADMIN` role only.

---

## 2. Health & Platform Diagnostics

### `GET /api/health`
- **Auth**: `PUBLIC`
- **Description**: Lightweight orchestrator probe verifying backend uptime and database connectivity.
- **Response `200 OK`**:
  ```json
  {
    "status": "healthy",
    "platform": "IBVAP",
    "version": "1.0.0",
    "environment": "production",
    "uptime_seconds": 3600.5,
    "supabase_connected": true,
    "inference_engine": "YOLOv8 + ByteTrack + FaceNet + PaddleOCR",
    "active_websocket_clients": 2,
    "timestamp": "2026-09-29T13:30:00Z"
  }
  ```

### `GET /api/pipeline/status`
- **Auth**: `AUTHENTICATED`
- **Description**: Comprehensive inspection of all vision and ingestion modules.
- **Response `200 OK`**:
  ```json
  {
    "video_source": "OK",
    "yolo": "READY",
    "bytetrack": "READY",
    "face_recognition": "READY",
    "anpr": "READY",
    "event_engine": "READY",
    "supabase": "CONNECTED",
    "websocket": "READY",
    "details": { ... }
  }
  ```

---

## 3. SIH Demonstration Mode

### `POST /api/demo/start`
- **Auth**: `COMMANDER+`
- **Request Body (JSON, Optional)**:
  ```json
  {
    "video_path": "sample_feed.mp4"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "status": "STARTED",
    "running": true,
    "camera_id": "DEMO-001",
    "camera_name": "Border Surveillance Demo",
    "location": "Demo Border Post",
    "source": "video_file",
    "video_path": "sample_feed.mp4",
    "processing_fps": 5,
    "message": "IBVAP Demonstration Pipeline is running live."
  }
  ```
- **Errors**: `403 Forbidden` (if role is `VIEWER` or `OPERATOR`), `500 Internal Server Error`.

### `POST /api/demo/stop`
- **Auth**: `COMMANDER+`
- **Response `200 OK`**:
  ```json
  {
    "status": "STOPPED",
    "running": false,
    "camera_id": "DEMO-001",
    "message": "IBVAP Demonstration Pipeline stopped."
  }
  ```

### `GET /api/demo/status`
- **Auth**: `AUTHENTICATED`
- **Response `200 OK`**:
  ```json
  {
    "running": true,
    "camera_id": "DEMO-001",
    "camera_name": "Border Surveillance Demo",
    "status": "ONLINE",
    "processing_fps": 5,
    "uptime_seconds": 45.2
  }
  ```

### `GET /api/demo/metrics`
- **Auth**: `AUTHENTICATED`
- **Response `200 OK`**:
  ```json
  {
    "running": true,
    "camera_id": "DEMO-001",
    "input_fps": 20.0,
    "processing_fps": 5.0,
    "average_inference_time_ms": 22.4,
    "average_tracking_time_ms": 2.8,
    "frames_processed": 225,
    "frames_skipped": 0,
    "detections_count": 450,
    "unique_tracks_count": 8,
    "events_generated_count": 3,
    "pipeline_status": "RUNNING",
    "gpu_acceleration": true
  }
  ```

### `POST /api/demo/reset`
- **Auth**: `COMMANDER+`
- **Response `200 OK`**:
  ```json
  {
    "status": "RESET",
    "running": false,
    "camera_id": "DEMO-001",
    "message": "Demo mode states and performance counters reset successfully."
  }
  ```

---

## 4. CCTV Cameras & Stream Management

### `GET /api/cameras`
- **Auth**: `AUTHENTICATED`
- **Description**: Returns camera fleet with RTSP passwords securely masked.

### `GET /api/cameras/{camera_id}`
- **Auth**: `AUTHENTICATED`
- **Errors**: `400 Bad Request` (Invalid format), `404 Not Found`.

### `POST /api/cameras`
- **Auth**: `COMMANDER+`
- **Request Body (JSON)**:
  ```json
  {
    "id": "BOP-004",
    "name": "Northern Outpost Tower",
    "location": "Sector 4 Ridge",
    "sector": "SECTOR-B",
    "rtsp_url": "rtsp://admin:pass@192.168.1.104:554/live",
    "fps": 5,
    "resolution": "1920x1080"
  }
  ```

### `PUT /api/cameras/{camera_id}/zone`
- **Auth**: `COMMANDER+`
- **Request Body (JSON)**:
  ```json
  {
    "zone": [[100, 150], [540, 150], [540, 420], [100, 420]]
  }
  ```

### `DELETE /api/cameras/{camera_id}`
- **Auth**: `ADMIN` (Decommissioning camera fleet restricted to administrator).

### `POST /api/streams/start/{camera_id}` & `POST /api/streams/stop/{camera_id}`
- **Auth**: `OPERATOR+`

### `GET /api/streams/{camera_id}/preview`
- **Auth**: `AUTHENTICATED`
- **Response**: MJPEG video stream (`multipart/x-mixed-replace; boundary=frame`).

---

## 5. Vision AI, Biometrics & ANPR

### `POST /api/detect`
- **Auth**: `AUTHENTICATED`
- **Request**: Multipart image file (`file=@frame.jpg`).
- **Response `200 OK`**:
  ```json
  {
    "detections_count": 1,
    "detections": [
      {
        "class_id": 0,
        "object_type": "person",
        "confidence": 0.96,
        "bbox": [120, 80, 240, 360]
      }
    ],
    "inference_time_ms": 22.4
  }
  ```

### `POST /api/track`
- **Auth**: `AUTHENTICATED`
- **Request**: Multipart image file (`file=@frame.jpg`, query: `camera_id=BOP-001`).
- **Response `200 OK`**: Returns detections and associated ByteTrack persistent IDs.

### `POST /api/face/recognize`
- **Auth**: `AUTHENTICATED`
- **Request**: Multipart face crop image (`file=@face.jpg`).
- **Response `200 OK`**:
  ```json
  {
    "face_detected": true,
    "identity": "Inspector Priya Verma",
    "person_id": "BSF-2041",
    "friendly": true,
    "match_confidence": 0.92,
    "bbox": [140, 90, 190, 150]
  }
  ```

### `POST /api/face/friendly/register`
- **Auth**: `COMMANDER+`
- **Request**: Multipart form data (`person_code`, `full_name`, `role`, `unit`, `file=@portrait.jpg`).

### `DELETE /api/face/friendly/{person_id}`
- **Auth**: `ADMIN`

### `POST /api/anpr/recognize`
- **Auth**: `AUTHENTICATED`
- **Request**: Multipart vehicle image (`file=@vehicle.jpg`).
- **Response `200 OK`**: Returns detected license plate string, confidence, and vehicle classification.

---

## 6. Events & Alerts

### `GET /api/events`
- **Auth**: `AUTHENTICATED`
- **Query Params**: `limit=50`, `event_type=INTRUSION`.

### `POST /api/events/analyze`
- **Auth**: `OPERATOR+`
- **Request Body (JSON)**: Evaluates frame track objects against polygon boundaries and ambient luminance.

### `GET /api/alerts`
- **Auth**: `AUTHENTICATED`
- **Query Params**: `limit=50`, `status=ACTIVE`.

### `POST /api/alerts/{alert_id}/action`
- **Auth**: `OPERATOR+`
- **Request Body (JSON)**:
  ```json
  {
    "status": "ACKNOWLEDGED",
    "note": "Quick Reaction Team (QRT) dispatched to perimeter.",
    "operator_name": "Inspector Priya Verma"
  }
  ```

---

## 7. System Health & Hardware Telemetry

### `GET /api/system/health`
- **Auth**: `AUTHENTICATED`
- **Response `200 OK`**:
  ```json
  {
    "status": "healthy",
    "uptime_seconds": 7200.0,
    "cpu_percent": 14.5,
    "memory_percent": 42.1,
    "gpu": {
      "gpu_available": true,
      "gpu_name": "NVIDIA GeForce RTX 3050 6GB Laptop GPU",
      "gpu_memory_used_mb": 1420,
      "gpu_memory_total_mb": 6144,
      "gpu_utilization_percent": 18.0,
      "gpu_temperature_c": 52
    },
    "active_cameras": 1,
    "processing_fps": 5.0,
    "average_inference_ms": 22.4
  }
  ```

### `GET /api/system/metrics`
- **Auth**: `AUTHENTICATED`
- **Response `200 OK`**: Returns in-memory rolling component latencies (YOLO, ByteTrack, FaceNet, PaddleOCR, Event Engine).

---

## 8. Diagnostic Component Probes

Lightweight component health checks:
- `GET /api/test/yolo`
- `GET /api/test/tracking`
- `GET /api/test/anpr`
- `GET /api/test/face`
- `GET /api/test/events`
- `GET /api/test/supabase`

---

## 9. Real-Time WebSockets

### `WS /ws/live/{camera_id}`
- **Protocol**: WebSocket
- **Description**: Streams sub-second JSON telemetry packets directly to the React canvas.
- **Sample Payload**:
  ```json
  {
    "camera_id": "DEMO-001",
    "frame_timestamp": "2026-09-29T13:30:00.120Z",
    "processing_time_ms": 27.1,
    "detections": [
      {
        "camera_id": "DEMO-001",
        "track_id": 104,
        "object_type": "person",
        "confidence": 0.96,
        "bbox": [120, 80, 240, 360],
        "identity": null,
        "friendly": false,
        "timestamp": "2026-09-29T13:30:00.120Z"
      }
    ],
    "events": [
      {
        "event_id": "EVT-2026-9041",
        "camera_id": "DEMO-001",
        "track_id": 104,
        "event_type": "INTRUSION",
        "severity": "CRITICAL",
        "description": "Person entered restricted zone [BOP-001]",
        "timestamp": "2026-09-29T13:30:00.120Z"
      }
    ]
  }
  ```
