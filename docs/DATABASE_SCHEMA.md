# IBVAP — Database Schema & Storage Architecture

**Platform**: Intelligent Border Video Analytics Platform (IBVAP)  
**Database**: Supabase PostgreSQL 15+ with Row-Level Security (RLS)  
**Storage**: Private Supabase S3-Compatible Storage Bucket (`evidence`)  
**Document Version**: 1.0.0  

---

## 1. Relational Entity Overview

```
+-------------------+       1:N       +-------------------+
|      cameras      |----------------<|      events       |
| (Zone, RTSP, FPS) |                 | (Type, Severity)  |
+-------------------+                 +-------------------+
          |                                     |
          | 1:N                                 | 1:1
          v                                     v
+-------------------+       1:N       +-------------------+
| friendly_persons  |                 |      alerts       |
| (512-D Embedding) |                 | (Lifecycle, Note) |
+-------------------+                 +-------------------+
                                                |
                                                v
+-------------------+                 +-------------------+
|     profiles      |----------------<|    audit_logs     |
| (Role, Department)|       1:N       | (Immutable Trail) |
+-------------------+                 +-------------------+
```

---

## 2. Table Specifications

### 2.1 `profiles`
Stores authenticated defense personnel credentials, operational roles, and department assignments.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, references `auth.users(id)` | User unique identifier |
| `full_name` | `TEXT` | `NOT NULL` | Officer full name |
| `email` | `TEXT` | `UNIQUE`, `NOT NULL` | Official email address |
| `role` | `TEXT` | `NOT NULL`, `CHECK (role IN ('ADMIN','COMMANDER','OPERATOR','VIEWER'))` | RBAC clearance level |
| `department`| `TEXT` | Default `'Border Defense Command'` | Unit or outpost division |
| `badge_number`| `TEXT` | Unique officer badge identifier | E.g. `BSF-HQ-001` |
| `station` | `TEXT` | Assigned command center post | E.g. `Frontier Post Alpha` |
| `created_at`| `TIMESTAMPTZ`| Default `now()` | Account creation timestamp |
| `updated_at`| `TIMESTAMPTZ`| Default `now()` | Last profile modification |

---

### 2.2 `cameras`
Stores fleet camera configurations, RTSP ingestion endpoints, stream statuses, and spatial polygon boundary coordinates.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` (e.g. `BOP-001`, `DEMO-001`) | Camera alphanumeric identifier |
| `name` | `TEXT` | `NOT NULL` | Display name for surveillance UI |
| `location` | `TEXT` | `NOT NULL` | Geographical outpost deployment sector |
| `sector` | `TEXT` | Default `'SECTOR-A'` | Tactical border monitoring sector |
| `rtsp_url` | `TEXT` | Secure stream address (masked on client reads) | CCTV RTSP endpoint or video file |
| `status` | `TEXT` | Default `'ONLINE'`, `CHECK (status IN ('ONLINE','OFFLINE','WARNING','RECONNECTING'))` | Ingestion status |
| `fps` | `INTEGER` | Default `5` | Ingestion target frame rate |
| `resolution` | `TEXT` | Default `'1920x1080'` | Ingestion resolution |
| `virtual_fence`| `JSONB`| Polygon coordinate array `[[x, y], ...]` | Restricted intrusion perimeter |
| `ip_address` | `TEXT` | Static hardware IP address | E.g. `192.168.1.101` |
| `created_at` | `TIMESTAMPTZ`| Default `now()` | Registration timestamp |
| `updated_at` | `TIMESTAMPTZ`| Default `now()` | Last configuration update |

---

### 2.3 `friendly_persons`
Stores biometric facial embeddings and identification records for verified military and authorized border personnel.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` (e.g. `FP-001`) | Person registration identifier |
| `person_code`| `TEXT` | `UNIQUE`, `NOT NULL` | Defense service ID (e.g. `BSF-1024`) |
| `full_name` | `TEXT` | `NOT NULL` | Name of authorized personnel |
| `role` | `TEXT` | `NOT NULL` | Rank / Designation |
| `unit` | `TEXT` | Assigned battalion / division | E.g. `12th BSF Battalion` |
| `status` | `TEXT` | Default `'FRIENDLY'`, `CHECK (status IN ('FRIENDLY','INACTIVE'))` | Biometric match status |
| `photo_url` | `TEXT` | Reference to enrolled portrait photo | Public/signed thumbnail URL |
| `face_embedding`| `FLOAT8[]` | 512-dimensional normalized vector | Computed by FaceNet InceptionResnetV1 |
| `created_at` | `TIMESTAMPTZ`| Default `now()` | Enrollment timestamp |
| `updated_at` | `TIMESTAMPTZ`| Default `now()` | Last modification timestamp |

---

### 2.4 `events`
Stores security-relevant events generated in real-time by the Spatial Behavior Event Engine.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` (e.g. `EVT-2026-9041`) | Event unique identifier |
| `camera_id` | `TEXT` | `REFERENCES cameras(id)` | Camera where event occurred |
| `track_id` | `INTEGER` | ByteTrack tracking ID | Target persistent track number |
| `event_type`| `TEXT` | `NOT NULL`, `CHECK (event_type IN ('INTRUSION','LOITERING','NIGHT_MOVEMENT','STATIONARY_PERSON','ANPR_DETECTION'))` | Event classification |
| `severity` | `TEXT` | `NOT NULL`, `CHECK (severity IN ('CRITICAL','WARNING','INFO'))` | Tactical threat level |
| `confidence`| `FLOAT8` | Range `0.0 - 1.0` | Event trigger confidence score |
| `description`| `TEXT` | Detailed event log summary | E.g. `Person entered restricted zone` |
| `bbox` | `JSONB` | Array `[x1, y1, x2, y2]` | Bounding box at trigger timestamp |
| `evidence_url`| `TEXT` | Path to evidence frame in Storage | E.g. `evidence/EVT-2026-9041.jpg` |
| `metadata` | `JSONB` | Supplementary forensic key-values | E.g. `{"dwell_time": 32, "plate": "DL8C"}` |
| `timestamp` | `TIMESTAMPTZ`| Default `now()` | Timestamp of occurrence |

---

### 2.5 `alerts`
Stores actionable tactical incidents requiring operator triage, escalation, and resolution.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` (e.g. `ALT-2026-8801`) | Alert unique identifier |
| `event_id` | `TEXT` | `REFERENCES events(id)` | Associated source event |
| `camera_id` | `TEXT` | `REFERENCES cameras(id)` | Camera origin |
| `title` | `TEXT` | `NOT NULL` | Tactical alert title |
| `severity` | `TEXT` | `NOT NULL`, `CHECK (severity IN ('CRITICAL','WARNING','INFO'))` | Threat level |
| `status` | `TEXT` | Default `'ACTIVE'`, `CHECK (status IN ('ACTIVE','ACKNOWLEDGED','RESOLVED'))` | Incident lifecycle state |
| `description`| `TEXT` | Contextual alert summary | Incident details |
| `acknowledged_by`| `TEXT`| Officer identity who acknowledged | Operator name / User ID |
| `resolved_by` | `TEXT` | Officer identity who resolved | Operator name / User ID |
| `notes` | `TEXT` | Incident log notes from operator | Triage commentary |
| `created_at` | `TIMESTAMPTZ`| Default `now()` | Incident trigger timestamp |
| `updated_at` | `TIMESTAMPTZ`| Default `now()` | Last lifecycle transition timestamp |

---

### 2.6 `audit_logs`
Immutable, tamper-evident log recording all administrative and operational mutations.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Unique log entry ID |
| `user_id` | `TEXT` | Actor user ID | Officer identity |
| `user_name` | `TEXT` | Officer full name | Human readable identity |
| `user_role` | `TEXT` | Role at action time (`ADMIN`, etc.) | Clearance level |
| `action` | `TEXT` | `NOT NULL` (e.g. `ALERT_ACKNOWLEDGED`, `ROLE_CHANGED`) | Performed operation |
| `resource_type`| `TEXT`| E.g. `alerts`, `cameras`, `users` | Target resource |
| `resource_id` | `TEXT` | Identifier of affected entity | E.g. `ALT-2026-8801` |
| `details` | `JSONB` | Serialized before/after change details | Payload inspection |
| `ip_address` | `TEXT` | Client / Origin IP | Source network address |
| `timestamp` | `TIMESTAMPTZ`| Default `now()` | Immutable timestamp |

---

## 3. Storage Bucket: `evidence`

- **Bucket Name**: `evidence`
- **Access Level**: **Private** (Public access explicitly disabled)
- **Policies**:
  - `service_role`: Full Read/Write access (for FastAPI automated snapshot upload).
  - `authenticated`: Read access via signed temporary tokens (1-hour expiration).
  - `anon`: **Deny All**
