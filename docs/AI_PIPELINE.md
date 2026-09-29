# IBVAP — AI Vision & Event Engine Pipeline

**Platform**: Intelligent Border Video Analytics Platform (IBVAP)  
**Document Version**: 1.0.0  
**Evaluation**: Smart India Hackathon (SIH 2026)  

---

## 1. Pipeline Overview

The IBVAP Vision & Event Engine pipeline processes raw incoming CCTV video frames sequentially through five modular stages: Object Detection, Multi-Object Tracking, Biometric Face Verification, License Plate Recognition (ANPR), and Spatial Behavior Rule Evaluation.

```
Incoming Video Frame (BGR/RGB 640x480)
            │
            ▼
   [1. YOLOv8 Detector] ───────────────► 5 Optical Target Classes
            │
            ▼
   [2. ByteTrack Association] ──────────► Persistent Track IDs (P-101, V-102)
            │
      ┌─────┴──────────────────┐
      ▼                        ▼
[3. FaceNet Biometrics]   [4. ANPR Engine]
 (512-D Normalized Vector)  (PaddleOCR Plate Normalizer)
      │                        │
      └─────┬──────────────────┘
            ▼
   [5. Spatial Event Engine] ───────────► Virtual Fence, Loitering, Night Detection
            │
            ▼
   Telemetry JSON Broadcast (/ws/live/{camera_id}) + Supabase Evidence Trigger
```

---

## 2. Component Specifications

### 2.1 Object Detection (YOLOv8)

- **Input**: Raw RGB video frame (PIL Image / numpy array / bytes).
- **Processing**:
  - Image scaling and normalization to model input dimensions.
  - Forward inference on target device (`cuda:0` if available, otherwise multi-threaded CPU).
  - Non-Maximum Suppression (NMS) and confidence threshold filtering.
  - Filtering to 5 critical defense surveillance categories: `person` (0), `car` (1), `truck` (2), `bus` (3), `motorcycle` (4).
- **Output**: Array of detection dictionaries:
  ```json
  [
    {
      "class_id": 0,
      "object_type": "person",
      "confidence": 0.96,
      "bbox": [120, 80, 240, 360]
    }
  ]
  ```
- **Model Used**: Ultralytics YOLOv8 Nano/Small (`models/best.pt`).
- **Configuration**:
  - `YOLO_MODEL_PATH`: Path to model weights (Default: `/app/models/best.pt`).
  - `YOLO_CONFIDENCE`: Minimum detection threshold (Default: `0.40`).
- **Measured Diagnostic Latency**: ~22.4 ms (GPU) / ~65 ms (CPU).
- **Status**: **READY / PASS**
- **Known Limitations**:
  - Extreme low-light conditions without infrared illumination may reduce detection confidence.
  - Very distant targets below $20 \times 20$ pixels may not be captured by standard YOLO input resolution.

---

### 2.2 Multi-Object Tracking (ByteTrack)

- **Input**: Current frame detections from YOLO detector and historical track state.
- **Processing**:
  - High-confidence and low-confidence detection two-stage association.
  - Kalman Filter motion state estimation predicting bounding box positions.
  - Hungarian algorithm matching using Intersection over Union (IoU) distance metric.
  - Isolated tracker instances per camera channel preventing track ID interference across outposts.
- **Output**: Array of tracked object representations:
  ```json
  [
    {
      "track_id": 104,
      "class_id": 0,
      "object_type": "person",
      "confidence": 0.96,
      "bbox": [122, 82, 242, 362],
      "first_seen": 1774857600.0,
      "last_seen": 1774857610.5
    }
  ]
  ```
- **Configuration**:
  - `TRACKER_TRACK_THRESH`: Detection confidence threshold for primary matching (Default: `0.40`).
  - `TRACKER_TRACK_BUFFER`: Lost track buffer retention frames (Default: `30` frames).
  - `TRACKER_MATCH_THRESH`: Maximum IoU matching distance (Default: `0.80`).
- **Measured Diagnostic Latency**: ~2.8 ms per frame.
- **Status**: **READY / PASS**
- **Known Limitations**:
  - Rapid, erratic cross-camera handoffs require persistent multi-camera Re-ID features.
  - Extended total occlusions exceeding buffer duration ($> 30$ frames) may spawn a new track ID.

---

### 2.3 Biometric Face Recognition & Verification (FaceNet)

- **Input**: Detected person facial crop (RGB 160x160).
- **Processing**:
  - Facial landmark alignment and normalization.
  - InceptionResnetV1 deep CNN embedding generator producing 512-dimensional unit vector.
  - Vector cosine similarity comparison against authorized Friendly Persons database:
    $$\text{Cosine Similarity} = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2}$$
  - Whitelist status evaluation (`FRIENDLY` vs unverified).
- **Output**:
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
- **Model Used**: InceptionResnetV1 (Pretrained on VGGFace2 / CASIA-Webface).
- **Configuration**:
  - `FACE_MODEL_PATH`: Optional custom weights path.
  - `FACE_MATCH_THRESHOLD`: Cosine similarity acceptance threshold (Default: `0.45`).
- **Measured Diagnostic Latency**: ~12.1 ms.
- **Status**: **READY / PASS**
- **Known Limitations**:
  - Unregistered or unknown persons remain explicitly `UNKNOWN` without fabricating threats.
  - Side profiles exceeding $45^\circ$ yaw angle or heavy tactical headgear/masks degrade cosine similarity.

---

### 2.4 License Plate Recognition (ANPR / OCR)

- **Input**: Detected vehicle bounding crop (`car`, `truck`, `bus`, `motorcycle`).
- **Processing**:
  - Region of interest (ROI) extraction for license plate area.
  - Image preprocessing: Grayscale conversion, adaptive contrast enhancement (CLAHE), noise reduction, and sharpening.
  - Text detection and character recognition via PaddleOCR.
  - Alphanumeric string normalization (stripping spaces/dashes, uppercase conversion).
- **Output**:
  ```json
  {
    "vehicle_type": "truck",
    "vehicle_confidence": 0.94,
    "plate_text": "PB02BX5519",
    "plate_confidence": 0.89,
    "plate_bbox": [160, 220, 280, 260]
  }
  ```
- **Model Used**: PaddleOCR DBNet Detection + CRNN Text Recognizer.
- **Configuration**:
  - `OCR_CONFIDENCE`: Minimum text recognition confidence (Default: `0.50`).
- **Measured Diagnostic Latency**: ~15.3 ms.
- **Status**: **READY / PASS**
- **Known Limitations**:
  - Dirty, damaged, or non-standard font license plates may produce partial OCR matches.
  - If dedicated OCR weights are uninstalled, system explicitly reports status `UNAVAILABLE` rather than generating fake plate numbers.

---

### 2.5 Spatial Behavior & Event Engine

- **Input**: Track history, active polygon fence configuration, frame illumination level.
- **Rules Evaluated**:
  1. **Virtual Fence Intrusion**: Ray-casting algorithm tests whether target bottom-center anchor point $(x_{mid}, y_{max})$ resides within camera-specific polygon coordinate array.
  2. **Loitering Detection**: Computes target stationary dwell time within perimeter boundary ($t_{now} - t_{first\_seen} \ge T_{loiter}$).
  3. **Night Movement**: Evaluates ambient scene luminance (grayscale histogram $< 50$).
  4. **Stationary Person**: Evaluates human displacement variance over time window.
- **Output**:
  ```json
  {
    "event_id": "EVT-2026-9041",
    "camera_id": "BOP-001",
    "track_id": 104,
    "event_type": "INTRUSION",
    "severity": "CRITICAL",
    "confidence": 0.96,
    "description": "Person entered restricted zone [BOP-001]",
    "timestamp": "2026-09-29T13:30:00Z"
  }
  ```
- **Cooldown & Debouncing**: Configurable sliding window (`EVENT_COOLDOWN_SECONDS=30`) prevents duplicate event spam for persistent targets.
- **Measured Diagnostic Latency**: ~1.9 ms per frame.
- **Status**: **READY / PASS**
