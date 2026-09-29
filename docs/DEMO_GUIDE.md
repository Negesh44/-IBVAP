# IBVAP — SIH 2026 Presentation & Demonstration Guide

**Platform**: Intelligent Border Video Analytics Platform (IBVAP)  
**Target Audience**: Smart India Hackathon (SIH 2026) Jury & Evaluators  
**Document Version**: 1.0.0  

---

## 1. Demonstration Flow Sequence

Follow this exact 18-step sequence during the live presentation to showcase all working modules in real-time:

```
[1. Login] ──► [2. Dashboard] ──► [3. Camera Fleet] ──► [4. Start Demo (DEMO-001)]
                                                                  │
┌─────────────────────────────────────────────────────────────────┘
▼
[5. Live Surveillance Matrix] ──► [6. YOLO Detections] ──► [7. ByteTrack Tracking]
                                                                  │
┌─────────────────────────────────────────────────────────────────┘
▼
[8. Friendly Biometrics] ──► [9. ANPR OCR] ──► [10. Event Engine Intrusion]
                                                       │
┌──────────────────────────────────────────────────────┘
▼
[11. Tactical Siren Alert] ──► [12. Evidence Vault] ──► [13. Alert Acknowledge]
                                                               │
┌──────────────────────────────────────────────────────────────┘
▼
[14. Alert Resolution] ──► [15. Events Page] ──► [16. Analytics Visualizations]
                                                        │
┌───────────────────────────────────────────────────────┘
▼
[17. Audit Log Trail] ──► [18. GPU System Health Telemetry]
```

---

## 2. Step-by-Step Presentation Walkthrough

### Step 1: Authentication & Role Selection
1. Open the IBVAP web application at [http://localhost:5173](http://localhost:5173).
2. Log in using the **Admin / Commander** profile (`admin@ibvap.gov.in` / `Col. Sanjeev Rawat`).
3. Point out the displayed **RBAC clearance badge** (`ADMIN`) in the top navigation header.

### Step 2: Main Tactical Dashboard Overview
1. Highlight the high-level KPI cards: Active Cameras, Active Alerts, Threat Level (`ELEVATED`), People & Vehicle Detections.
2. Note the dynamic connection indicators for **FastAPI AI Backend** and **Supabase Database Gateway**.

### Step 3: Camera Fleet Management
1. Navigate to **Cameras** in the sidebar.
2. Demonstrate camera registry cards displaying locations (`BOP-001`, `BOP-002`, `BOP-003`, `CHECKPOST-001`), sectors, and operational FPS.
3. Highlight that raw RTSP passwords are automatically sanitized and never visible to client inspectors.

### Step 4: Launching One-Click SIH Demo Mode
1. Navigate to **Live Surveillance**.
2. Locate the top **SIH DEMO MODE** toolbar banner.
3. Click the green **START DEMO** button.
4. The system initializes `DEMO-001` (**Border Surveillance Demo**), binds the tactical polygon fence, and activates the live video ingestion worker.

### Step 5: Live Surveillance Matrix
1. Show the `DEMO-001` camera card streaming video with live status `ONLINE` and dynamic FPS indicator (`5.0 FPS`).
2. Switch between **Grid View** (`1x1`, `2x2`, `3x2`) and **Map View** to show outpost tactical positioning.

### Step 6: Real-Time YOLO Detections
1. Observe bounding boxes dynamically drawn over detected targets on the canvas.
2. Highlight detection classes: `person`, `car`, `truck`, `bus`, `motorcycle` with confidence ratings (e.g. `96%`).

### Step 7: ByteTrack Multi-Object Target Tracking
1. Show that each target is assigned a persistent track ID (e.g. `P-101`, `P-102`).
2. Point out that the Kalman filter maintains track continuity even as targets walk behind foreground posts or trees.

### Step 8: Biometric Friendly Person Recognition
1. When an enrolled military officer enters the frame, the bounding box turns green and displays the verified identity (e.g. `Inspector Priya Verma (BSF-2041)`).
2. Clarify that unknown persons remain labeled `UNKNOWN` without automatically making false threat claims.

### Step 9: License Plate Recognition (ANPR)
1. Point out the vehicle detections displaying extracted license plate numbers (e.g. `DL8C`) with normalization.

### Step 10: Spatial Event Engine Triggering
1. As a target crosses into the red polygon boundary, the Event Engine evaluates point-in-polygon coordinates.
2. The HUD displays a pulsing **INTRUSION EVENT** trigger.

### Step 11: Tactical Siren Alert Generation
1. A red **CRITICAL ALERT** card pops up in the Alert Triage drawer.
2. The synthesized Web Audio siren fires to notify command room personnel.

### Step 12: Forensic Evidence Inspection
1. Click the alert card to open the **Alert Detail Modal**.
2. Show the high-resolution evidence snapshot with annotated bounding boxes loaded securely from the private Supabase Storage bucket via signed temporary tokens.

### Step 13: Alert Acknowledgement
1. Click **ACKNOWLEDGE ALERT**.
2. Enter an operational dispatch note: `"QRT Unit 2 dispatched to perimeter."`
3. Status transitions to `ACKNOWLEDGED`.

### Step 14: Alert Resolution
1. Once the area is cleared, click **RESOLVE ALERT**.
2. Enter resolution note: `"Perimeter inspected and secured."`
3. Status transitions to `RESOLVED`.

### Step 15: Security Events Ledger
1. Navigate to **Events** in the sidebar.
2. Filter events by type (`INTRUSION`, `LOITERING`, `NIGHT_MOVEMENT`, `ANPR_DETECTION`).
3. Inspect forensic metadata payloads containing dwell times and trigger timestamps.

### Step 16: Analytics & Visualizations
1. Navigate to **Analytics**.
2. Toggle the 5 timeframes (`Last 1 hour`, `Last 6 hours`, `Last 24 hours`, `Last 7 days`, `Last 30 days`).
3. Review the 7 interactive Recharts panels: Hourly Trend, Incidents by Severity, Category Distribution, Camera Fleet Rankings, and Biometric Ratios.

### Step 17: Immutable Audit Trail
1. Navigate to **Audit Logs**.
2. Inspect the immutable ledger showing actor identities, role clearances, IP addresses, and exact timestamps for the alert acknowledgement and resolution actions just executed.

### Step 18: System Health & GPU Telemetry
1. Navigate to **System Health** (or view status in live toolbar).
2. Point out the hardware telemetry: NVIDIA GPU model name (e.g. `NVIDIA GeForce RTX 3050`), VRAM utilization, temperature, CPU/memory usage, and rolling pipeline component latencies.
