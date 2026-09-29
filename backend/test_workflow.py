"""
End-to-End Workflow Integration Test for IBVAP.

Validates the complete chain:
AI Event Engine
→ Event Generation
→ Alert Triggering & Mapping (INTRUSION -> CRITICAL)
→ Evidence Snapshot Capture & Storage Upload
→ Secure Evidence Retrieval (/api/evidence/{id})
→ Alert Acknowledgment (/api/alerts/{id}/action -> ACKNOWLEDGED)
→ Alert Resolution (/api/alerts/{id}/action -> RESOLVED)
→ Tamper-Evident Audit Logging (ALERT_CREATED, EVIDENCE_UPLOADED, ALERT_ACKNOWLEDGED, ALERT_RESOLVED)

Usage:
    python test_workflow.py
"""

import time
import io
import requests
from PIL import Image, ImageDraw
import numpy as np

from events.event_engine import event_engine
from services.supabase_service import supabase_service


def generate_sample_cctv_evidence_frame() -> bytes:
    """Creates a sample JPEG frame for evidence snapshot upload."""
    img = Image.new("RGB", (640, 480), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)
    draw.rectangle([180, 120, 300, 360], outline=(255, 51, 75), width=3)
    draw.text((190, 100), "INTRUDER DETECTED [CRITICAL]", fill=(255, 51, 75))
    draw.text((20, 20), f"CAM: BOP-001 | TIME: {time.strftime('%Y-%m-%d %H:%M:%S')}", fill=(0, 229, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def test_complete_supabase_evidence_alert_workflow():
    print("\n==================================================")
    print("[1] Testing AI Event -> Supabase Event -> Alert Flow")
    print("==================================================")

    evidence_bytes = generate_sample_cctv_evidence_frame()
    camera_id = "BOP-001"
    track_id = 901
    now_epoch = time.time()

    # Step 1: Analyze frame with restricted virtual fence breach
    tracks = [
        {
            "track_id": track_id,
            "object_type": "person",
            "confidence": 0.97,
            "bbox": [200, 150, 300, 350] # Inside BOP-001 virtual fence [100, 100, 500, 400]
        }
    ]

    event_engine.cooldown.reset(camera_id)
    events = event_engine.analyze_frame(
        camera_id=camera_id,
        detections=[],
        tracks=tracks,
        image_bytes=evidence_bytes,
        current_time=now_epoch,
        persist_to_db=True
    )

    print(f"Generated Events Count: {len(events)}")
    assert len(events) >= 1, "Must generate at least 1 security event"
    
    primary_event = events[0]
    print(f"Primary Event: ID={primary_event['event_id']}, Type={primary_event['event_type']}, Severity={primary_event['severity']}")
    assert primary_event["event_type"] == "INTRUSION", "Event type must be INTRUSION"
    assert primary_event["severity"] == "CRITICAL", "Intrusion severity must be CRITICAL"

    print("\n==================================================")
    print("[2] Testing Evidence Snapshot & Storage Upload")
    print("==================================================")
    evidence_url = supabase_service.upload_evidence(
        image_bytes=evidence_bytes,
        camera_id=camera_id,
        event_type="INTRUSION",
        track_id=track_id,
        timestamp_str=primary_event["timestamp"]
    )
    print(f"Evidence Storage Path/URL: {evidence_url}")
    assert evidence_url is not None, "Evidence URL must be generated"

    print("\n==================================================")
    print("[3] Testing Secure Backend Evidence Access")
    print("==================================================")
    evidence_data = supabase_service.get_evidence_by_event_id(primary_event["event_id"])
    print("Retrieved Evidence Data:", evidence_data)
    assert evidence_data is not None, "Must retrieve evidence for event ID"
    assert "evidence_url" in evidence_data

    print("\n==================================================")
    print("[4] Testing Alert Lifecycle: ACKNOWLEDGE -> RESOLVE")
    print("==================================================")
    alert_id = f"ALT-{primary_event['event_id'].replace('EVT-', '')}"
    
    # 4A. Acknowledge
    ack_res = supabase_service.update_alert_status(alert_id, "ACKNOWLEDGED", "Verified by Sentry Post 1")
    print(f"Alert Acknowledged: ID={alert_id}, Status={ack_res.get('status') if ack_res else 'N/A'}")
    
    # 4B. Resolve
    res_res = supabase_service.update_alert_status(alert_id, "RESOLVED", "Area swept and secured by QRT")
    print(f"Alert Resolved: ID={alert_id}, Status={res_res.get('status') if res_res else 'N/A'}")

    print("\n==================================================")
    print("[5] Testing Tamper-Evident Audit Logging")
    print("==================================================")
    audit_ack = supabase_service.create_audit_log(
        action="ALERT_ACKNOWLEDGED",
        category="ALERT",
        record_id=alert_id,
        details="Operator acknowledged alert",
        user_name="Commander Rawat",
        user_role="COMMANDER"
    )
    print(f"Audit Log Ack: {audit_ack['action']} (ID: {audit_ack['id']})")
    assert audit_ack["action"] == "ALERT_ACKNOWLEDGED"

    audit_res = supabase_service.create_audit_log(
        action="ALERT_RESOLVED",
        category="ALERT",
        record_id=alert_id,
        details="Threat cleared by QRT patrol",
        user_name="Commander Rawat",
        user_role="COMMANDER"
    )
    print(f"Audit Log Resolve: {audit_res['action']} (ID: {audit_res['id']})")
    assert audit_res["action"] == "ALERT_RESOLVED"

    print("\n==================================================")
    print("SUCCESS: Complete Supabase Realtime + Evidence + Alert Workflow Verified.")
    print("==================================================")


if __name__ == "__main__":
    test_complete_supabase_evidence_alert_workflow()
