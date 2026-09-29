# IBVAP — System Architecture Specification

**Platform**: Intelligent Border Video Analytics Platform (IBVAP)  
**Hackathon**: Smart India Hackathon (SIH 2026)  
**Document Version**: 1.0.0  

---

## 1. High-Level Architecture Overview

IBVAP is designed as a distributed, low-latency tactical video surveillance and analytics platform for border outposts (BOPs), perimeter security checkposts, and defense monitoring centers. The system connects multi-camera RTSP/ONVIF streams or demonstration video sources to an asynchronous AI inference pipeline in FastAPI, broadcasting real-time target bounding boxes, facial recognition hits, ANPR OCR metadata, and spatial behavior events to a React command dashboard while persisting critical security alerts and evidence in Supabase.

```
+--------------------------------------------------------------------------------------------------+
|                                    CCTV & VIDEO INGESTION LAYER                                  |
|   [IP CCTV Cameras (RTSP/ONVIF)]  <--->  [Local MP4 / Demonstration Video Source (DEMO-001)]     |
+-------------------------------------------------+------------------------------------------------+
                                                  |
                                                  v
+--------------------------------------------------------------------------------------------------+
|                                   FASTAPI AI INGESTION BACKEND                                   |
|                                                                                                  |
|   +--------------------------+    +--------------------------+    +--------------------------+   |
|   |   RTSP Stream Worker     |--->|     YOLOv8 Detection     |--->|    ByteTrack Tracking    |   |
|   |  (5 FPS Frame Queue)     |    | (person, car, truck, bus)|    |  (Persistent Track IDs)  |   |
|   +--------------------------+    +--------------------------+    +--------------------------+   |
|                                                                                 |                |
|         +-----------------------------------------------------------------------+                |
|         v                                                                                        |
|   +--------------------------+    +--------------------------+    +--------------------------+   |
|   |    FaceNet Recognition   |    |         ANPR OCR         |    |   Spatial Event Engine   |   |
|   |  (512-D Biometrics)      |    | (PaddleOCR Normalization)|    | (Virtual Fence/Loitering)|   |
|   +--------------------------+    +--------------------------+    +--------------------------+   |
|                                                                                 |                |
|                               +-------------------------------------------------+                |
|                               v                                                                  |
|   +---------------------------------------+    +---------------------------------------------+   |
|   |    FastAPI WebSocket Broadcaster      |    |     Supabase Gateway & Evidence Manager     |   |
|   |   (/ws/live/{camera_id} @ < 1ms)      |    |    (PostgreSQL RLS + Private Storage Bucket)|   |
|   +---------------------------------------+    +---------------------------------------------+   |
+----------------------+--------------------------------------------------+------------------------+
                       |                                                  |
                       v                                                  v
+--------------------------------------------------------------------------------------------------+
|                                  REACT COMMAND DASHBOARD (VITE 6)                                |
|                                                                                                  |
|   +-----------------------+   +-----------------------+   +-----------------------+              |
|   |   Live Surveillance   |   |   Alerts & Triage     |   |  Evidence Inspection  |              |
|   | (Canvas Bounding Box) |   | (Realtime Audio Siren)|   | (Signed Token URLs)   |              |
|   +-----------------------+   +-----------------------+   +-----------------------+              |
|                                                                                                  |
|   +-----------------------+   +-----------------------+   +-----------------------+              |
|   |  Analytics & Metrics  |   |   Audit Logs Ledger   |   |   User Administration |              |
|   |  (7 Recharts Panels)  |   | (Immutable Activity)  |   |  (RBAC 4-Tier Roles)  |              |
|   +-----------------------+   +-----------------------+   +-----------------------+              |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Component Breakdown

### 2.1 Ingestion & Frame Processing
- **Multi-Camera Concurrency**: Dedicated `CameraWorker` threads capture frames using OpenCV with minimal buffer latency (`cv2.CAP_PROP_BUFFERSIZE = 1`).
- **Processing Rate Limiter**: Configured to 5 FPS per stream (`PROCESS_FPS=5`) to prevent CPU/GPU saturation while maintaining accurate temporal tracking.
- **Auto-Reconnection**: Reconnection logic with exponential backoff on stream dropouts.

### 2.2 AI Vision Pipeline
1. **YOLOv8 Detection**: Detects target object categories: `person`, `car`, `truck`, `bus`, `motorcycle`.
2. **ByteTrack Association**: Computes Kalman filter state estimates and IoU cost matrices to maintain persistent track IDs across frames and temporary occlusions.
3. **FaceNet Biometric Matcher**: Computes 512-dimensional normalized embeddings for detected facial crops and compares against the authorized Friendly Persons database with cosine similarity thresholds.
4. **ANPR OCR Engine**: Crops detected vehicle regions, performs contrast/sharpening morphology normalization, and passes crops to PaddleOCR.
5. **Spatial Event Engine**: Evaluates track coordinates against configured camera polygon zones (`INTRUSION`), dwell duration (`LOITERING`), illumination levels (`NIGHT_MOVEMENT`), and stationary objects (`STATIONARY_PERSON`).

### 2.3 Real-Time & Event Dispatch
- **WebSocket Channel**: Dedicated endpoint `/ws/live/{camera_id}` streams JSON telemetry containing bounding boxes, track IDs, facial identities, license plates, and active event flags directly to the client canvas.
- **Supabase Realtime**: PostgREST broadcast channel sends alert lifecycle mutations (`ACTIVE` $\to$ `ACKNOWLEDGED` $\to$ `RESOLVED`) across connected dashboard operators.

### 2.4 Data & Storage Layer
- **PostgreSQL Database**: Stores camera configurations, polygon zones, biometric profiles, events, alert triage logs, and immutable audit trails with Row-Level Security (RLS).
- **Evidence Storage Bucket**: Private storage bucket storing encrypted/signed evidence snapshots captured during trigger events.

---

## 3. Communication Protocols & Ports

| Service | Port | Protocol | Purpose |
| :--- | :--- | :--- | :--- |
| **FastAPI Backend** | 8000 | HTTP / REST | API endpoints, system health, diagnostic probes |
| **FastAPI WebSockets** | 8000 | WS / WSS | Low-latency live telemetry stream |
| **React Dashboard** | 5173 / 3000 | HTTP | Vite development and static web serving |
| **Supabase Cloud/Local** | 443 / 54321 | HTTPS / WSS | PostgreSQL database, Auth, Storage, Realtime |
| **RTSP Cameras** | 554 / Custom | RTSP / RTP | H.264 video feed ingestion from IP cameras |
