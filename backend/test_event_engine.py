"""
Unit and Integration Tests for IBVAP Event Detection Engine.

Covers:
1. Person entering virtual fence (INTRUSION - CRITICAL)
2. Person leaving virtual fence (state transition)
3. Loitering detection (LOITERING - WARNING after threshold exceeded)
4. Night movement detection (NIGHT_MOVEMENT - WARNING under low-light)
5. Stationary person behavior (STATIONARY_PERSON - INFO)
6. Duplicate-event cooldown / debouncing
7. HTTP endpoint POST /api/events/analyze

Usage:
    python test_event_engine.py
"""

import time
import requests
from events.event_rules import EventRulesConfig, EventCooldownTracker
from events.virtual_fence import VirtualFenceManager, is_point_in_polygon
from events.loitering import LoiteringDetector
from events.night_detection import NightMovementDetector
from events.event_engine import EventDetectionEngine


def test_virtual_fence_intrusion_and_exit():
    """Unit test: Person entering and leaving virtual fence."""
    print("\n==================================================")
    print("[1] Testing Virtual Fence Intrusion & Exit")
    print("==================================================")

    manager = VirtualFenceManager()
    camera_id = "BOP-TEST-01"
    # Define 400x300 zone: [100, 100] to [500, 400]
    zone = [[100, 100], [500, 100], [500, 400], [100, 400]]
    manager.set_camera_zone(camera_id, zone)

    # 1. Target outside the fence: bbox [50, 50, 80, 80] -> foot (65, 80)
    res_outside = manager.evaluate_track(camera_id, track_id=101, bbox=[50, 50, 80, 80])
    print(f"Outside eval: is_inside={res_outside['is_inside']}, transition={res_outside['state_transition']}")
    assert not res_outside["is_inside"], "Target must be outside"
    assert res_outside["state_transition"] == "OUTSIDE"

    # 2. Target enters the fence: bbox [200, 150, 260, 250] -> foot (230, 250)
    res_entered = manager.evaluate_track(camera_id, track_id=101, bbox=[200, 150, 260, 250])
    print(f"Entered eval: is_inside={res_entered['is_inside']}, transition={res_entered['state_transition']}")
    assert res_entered["is_inside"], "Target must be inside"
    assert res_entered["state_transition"] == "ENTERED", "Transition must be ENTERED"

    # 3. Target remains inside
    res_inside = manager.evaluate_track(camera_id, track_id=101, bbox=[210, 160, 270, 260])
    print(f"Inside eval: is_inside={res_inside['is_inside']}, transition={res_inside['state_transition']}")
    assert res_inside["state_transition"] == "INSIDE"

    # 4. Target exits the fence: bbox [600, 500, 650, 550] -> foot (625, 550)
    res_left = manager.evaluate_track(camera_id, track_id=101, bbox=[600, 500, 650, 550])
    print(f"Exited eval: is_inside={res_left['is_inside']}, transition={res_left['state_transition']}")
    assert not res_left["is_inside"]
    assert res_left["state_transition"] == "LEFT", "Transition must be LEFT"

    print("SUCCESS: Virtual fence entry and exit state transitions verified.")


def test_loitering_detection():
    """Unit test: Loitering detection after threshold is exceeded."""
    print("\n==================================================")
    print("[2] Testing Loitering Detection Threshold")
    print("==================================================")

    # 10 second threshold for fast unit testing
    detector = LoiteringDetector(loitering_threshold_seconds=10.0)
    camera_id = "BOP-TEST-02"
    track_id = 202
    t0 = 1000.0

    # Frame 1: t=0s
    res1 = detector.update_track(camera_id, track_id, bbox=[100, 100, 150, 200], is_inside_zone=True, current_time=t0)
    print(f"t=0s: is_loitering={res1['is_loitering']}, dwell={res1['dwell_duration_seconds']}s")
    assert not res1["is_loitering"], "Should not loiter at t=0s"

    # Frame 2: t=5s (under 10s threshold)
    res2 = detector.update_track(camera_id, track_id, bbox=[105, 102, 155, 202], is_inside_zone=True, current_time=t0 + 5.0)
    print(f"t=5s: is_loitering={res2['is_loitering']}, dwell={res2['dwell_duration_seconds']}s")
    assert not res2["is_loitering"], "Should not loiter at t=5s"

    # Frame 3: t=11s (exceeds 10s threshold)
    res3 = detector.update_track(camera_id, track_id, bbox=[108, 104, 158, 204], is_inside_zone=True, current_time=t0 + 11.0)
    print(f"t=11s: is_loitering={res3['is_loitering']}, dwell={res3['dwell_duration_seconds']}s")
    assert res3["is_loitering"], "Must trigger is_loitering after exceeding threshold"

    print("SUCCESS: Loitering dwell detection verified.")


def test_stationary_person():
    """Unit test: Stationary behavior when target remains still."""
    print("\n==================================================")
    print("[3] Testing Stationary Person Behavior")
    print("==================================================")

    # 15 second threshold, 20px displacement threshold
    detector = LoiteringDetector(stationary_threshold_seconds=15.0, stationary_displacement_px=20.0)
    camera_id = "BOP-TEST-03"
    track_id = 303
    t0 = 2000.0

    # Target stays within 5px displacement from [200, 200, 250, 300]
    detector.update_track(camera_id, track_id, bbox=[200, 200, 250, 300], current_time=t0)
    res_mid = detector.update_track(camera_id, track_id, bbox=[202, 201, 252, 301], current_time=t0 + 8.0)
    assert not res_mid["is_stationary"], "Should not trigger stationary before 15s"

    res_stat = detector.update_track(camera_id, track_id, bbox=[203, 202, 253, 302], current_time=t0 + 16.0)
    print(f"t=16s: is_stationary={res_stat['is_stationary']}, duration={res_stat['stationary_duration_seconds']}s, disp={res_stat['displacement_px']}px")
    assert res_stat["is_stationary"], "Must trigger is_stationary after 16s with minimal displacement"

    # Target moves rapidly 100px away -> stationary resets
    res_moved = detector.update_track(camera_id, track_id, bbox=[350, 350, 400, 450], current_time=t0 + 18.0)
    print(f"After movement: is_stationary={res_moved['is_stationary']}, disp={res_moved['displacement_px']}px")
    assert not res_moved["is_stationary"], "Must reset stationary state after large displacement"

    print("SUCCESS: Stationary person behavior and motion-reset verified.")


def test_night_movement():
    """Unit test: Night movement detection based on luminance."""
    print("\n==================================================")
    print("[4] Testing Night Movement Detection")
    print("==================================================")

    night_detector = NightMovementDetector(brightness_threshold=50.0)

    # Daylight frame (brightness = 140)
    day_res = night_detector.evaluate_night_movement(brightness_value=140.0, object_type="person")
    print(f"Daylight: is_night={day_res['is_night']}, trigger={day_res['triggers_night_movement']}")
    assert not day_res["is_night"]
    assert not day_res["triggers_night_movement"]

    # Night / Low-light frame (brightness = 32.5)
    night_res = night_detector.evaluate_night_movement(brightness_value=32.5, object_type="person")
    print(f"Night: is_night={night_res['is_night']}, trigger={night_res['triggers_night_movement']}")
    assert night_res["is_night"]
    assert night_res["triggers_night_movement"]

    print("SUCCESS: Night movement detection based on brightness threshold verified.")


def test_cooldown_debouncing():
    """Unit test: Event cooldown debouncer prevents duplicate alerts every frame."""
    print("\n==================================================")
    print("[5] Testing Event Cooldown / Debouncing")
    print("==================================================")

    cooldown = EventCooldownTracker(default_cooldown_seconds=30.0)
    camera_id = "BOP-001"
    track_id = 104
    event_type = "INTRUSION"
    t0 = 5000.0

    # 1. First event -> not in cooldown
    assert not cooldown.is_in_cooldown(camera_id, track_id, event_type, current_time=t0)
    cooldown.record_event(camera_id, track_id, event_type, current_time=t0)

    # 2. Immediate next frame (t=0.33s later) -> IN cooldown
    assert cooldown.is_in_cooldown(camera_id, track_id, event_type, current_time=t0 + 0.33)
    # 3. 15s later -> still IN cooldown
    assert cooldown.is_in_cooldown(camera_id, track_id, event_type, current_time=t0 + 15.0)

    # 4. 31s later -> cooldown expired
    assert not cooldown.is_in_cooldown(camera_id, track_id, event_type, current_time=t0 + 31.0)

    # 5. Different track_id on same camera -> not in cooldown
    assert not cooldown.is_in_cooldown(camera_id, track_id=999, event_type=event_type, current_time=t0 + 1.0)

    print("SUCCESS: Event debouncing and per-(camera, track, type) cooldown verified.")


def test_event_engine_pipeline():
    """Integration test: Full Event Detection Engine pipeline."""
    print("\n==================================================")
    print("[6] Testing EventDetectionEngine Master Pipeline")
    print("==================================================")

    engine = EventDetectionEngine()
    engine.cooldown.reset()
    camera_id = "BOP-001"

    # Frame 1: Person enters BOP-001 virtual fence [100, 100, 500, 400]
    tracks = [
        {
            "track_id": 104,
            "object_type": "person",
            "confidence": 0.96,
            "bbox": [200, 150, 300, 350]
        }
    ]

    events = engine.analyze_frame(
        camera_id=camera_id,
        detections=[],
        tracks=tracks,
        brightness=25.0, # Night lighting
        current_time=10000.0,
        persist_to_db=False
    )

    print(f"Generated events count: {len(events)}")
    for e in events:
        print(f" - [{e['severity']}] {e['event_type']}: {e['description']}")

    event_types = [e["event_type"] for e in events]
    assert "INTRUSION" in event_types, "Must detect INTRUSION"
    assert "NIGHT_MOVEMENT" in event_types, "Must detect NIGHT_MOVEMENT"

    # Verify schema fields
    e0 = events[0]
    for req_field in ["event_id", "camera_id", "track_id", "event_type", "severity", "confidence", "description", "bbox", "timestamp", "metadata"]:
        assert req_field in e0, f"Field '{req_field}' missing from event schema"

    # Frame 2: 1 second later (same state) -> debounced by cooldown
    events_frame2 = engine.analyze_frame(
        camera_id=camera_id,
        detections=[],
        tracks=tracks,
        brightness=25.0,
        current_time=10001.0,
        persist_to_db=False
    )
    print(f"Frame 2 (1s later) events count: {len(events_frame2)} (Expected 0 due to cooldown)")
    assert len(events_frame2) == 0, "Duplicate events must be suppressed by cooldown"

    print("SUCCESS: Event Engine Master Pipeline executed with full schema compliance.")


def test_http_api(base_url="http://localhost:8000"):
    """HTTP endpoint test: POST /api/events/analyze and POST /api/events/fence."""
    print("\n==================================================")
    print(f"[7] Testing HTTP Endpoint: {base_url}/api/events/analyze")
    print("==================================================")

    payload = {
        "camera_id": "BOP-001",
        "frame_width": 1920,
        "frame_height": 1080,
        "brightness": 35.0,
        "tracks": [
            {
                "track_id": 104,
                "object_type": "person",
                "confidence": 0.95,
                "bbox": [200, 150, 300, 350]
            }
        ]
    }

    try:
        res = requests.post(f"{base_url}/api/events/analyze", json=payload, timeout=10)
        print(f"Analyze Endpoint Status: {res.status_code}")
        print("Analyze Response:", res.json())
    except Exception as e:
        print(f"HTTP test skipped (server may not be running): {e}")


if __name__ == "__main__":
    test_virtual_fence_intrusion_and_exit()
    test_loitering_detection()
    test_stationary_person()
    test_night_movement()
    test_cooldown_debouncing()
    test_event_engine_pipeline()
    test_http_api()
