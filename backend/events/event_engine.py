import uuid
import time
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Union
from PIL import Image

from events.event_rules import EventRulesConfig, event_cooldown_tracker
from events.virtual_fence import virtual_fence_manager
from events.loitering import loitering_detector
from events.night_detection import night_movement_detector
from services.supabase_service import supabase_service

logger = logging.getLogger("ibvap.event_engine")


class EventDetectionEngine:
    """
    Core IBVAP Event Detection Engine.
    Combines YOLO detections, ByteTrack tracks, and camera configurations to detect
    security-relevant events using configurable rules without generating frame duplicate alerts.
    """

    def __init__(self):
        self.rules_config = EventRulesConfig()
        self.cooldown = event_cooldown_tracker
        self.fence = virtual_fence_manager
        self.loiter = loitering_detector
        self.night = night_movement_detector

    def analyze_frame(
        self,
        camera_id: str,
        detections: List[Dict[str, Any]],
        tracks: Optional[List[Dict[str, Any]]] = None,
        frame_width: int = 1920,
        frame_height: int = 1080,
        brightness: Optional[float] = None,
        image_bytes: Optional[bytes] = None,
        current_time: Optional[float] = None,
        persist_to_db: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Synthesizes AI detections and tracks against active security rules.
        Returns list of newly triggered, non-debounced events.
        """
        now_epoch = current_time if current_time is not None else time.time()
        now_iso = datetime.fromtimestamp(now_epoch, tz=timezone.utc).isoformat()

        generated_events: List[Dict[str, Any]] = []

        # If tracks are not explicitly passed, fallback to detections
        track_items = tracks if tracks is not None and len(tracks) > 0 else detections

        # 1. Evaluate Ambient Lighting / Night Condition
        night_eval = self.night.evaluate_night_movement(
            brightness_value=brightness,
            image_input=image_bytes,
            object_type="person"
        )
        is_night_frame = night_eval["triggers_night_movement"]

        for item in track_items:
            track_id = int(item.get("track_id", 0))
            object_type = item.get("object_type", "person").lower()
            confidence = float(item.get("confidence", 0.85))
            bbox = item.get("bbox", [0, 0, 100, 100])

            # Safety filter: Ignore low-confidence detections
            if confidence < 0.40:
                continue

            # =========================================================================
            # Rule 1: Virtual Fence / Intrusion Detection
            # =========================================================================
            fence_result = self.fence.evaluate_track(
                camera_id=camera_id,
                track_id=track_id,
                bbox=bbox,
                object_type=object_type
            )
            is_inside_restricted_zone = fence_result["is_inside"]
            state_transition = fence_result["state_transition"]

            # Trigger intrusion if track just entered the restricted zone
            if is_inside_restricted_zone and state_transition in ("ENTERED", "INSIDE"):
                event_type = "INTRUSION"
                if not self.cooldown.is_in_cooldown(camera_id, track_id, event_type, now_epoch):
                    self.cooldown.record_event(camera_id, track_id, event_type, now_epoch)
                    event_id = f"EVT-INT-{uuid.uuid4().hex[:8].upper()}"
                    
                    event_obj = {
                        "event_id": event_id,
                        "camera_id": camera_id,
                        "track_id": track_id,
                        "event_type": event_type,
                        "severity": EventRulesConfig.get_severity(event_type),
                        "confidence": confidence,
                        "description": f"{object_type.capitalize()} entered restricted virtual fence zone",
                        "bbox": bbox,
                        "timestamp": now_iso,
                        "metadata": {
                            "rule": "VIRTUAL_FENCE_POLYGON",
                            "state_transition": state_transition,
                            "reference_point": fence_result["reference_point"]
                        }
                    }
                    generated_events.append(event_obj)

            # =========================================================================
            # Rule 2 & 4: Loitering & Stationary Person Detection
            # =========================================================================
            if object_type == "person":
                loiter_res = self.loiter.update_track(
                    camera_id=camera_id,
                    track_id=track_id,
                    bbox=bbox,
                    is_inside_zone=is_inside_restricted_zone,
                    current_time=now_epoch
                )

                # Rule 2: Loitering Detection
                if loiter_res["is_loitering"]:
                    event_type = "LOITERING"
                    if not self.cooldown.is_in_cooldown(camera_id, track_id, event_type, now_epoch):
                        self.cooldown.record_event(camera_id, track_id, event_type, now_epoch)
                        event_id = f"EVT-LOIT-{uuid.uuid4().hex[:8].upper()}"

                        event_obj = {
                            "event_id": event_id,
                            "camera_id": camera_id,
                            "track_id": track_id,
                            "event_type": event_type,
                            "severity": EventRulesConfig.get_severity(event_type),
                            "confidence": confidence,
                            "description": f"Person observed loitering (dwell: {loiter_res['dwell_duration_seconds']}s, threshold: {self.loiter.loitering_threshold}s)",
                            "bbox": bbox,
                            "timestamp": now_iso,
                            "metadata": {
                                "rule": "LOITERING_DWELL_TIMER",
                                "dwell_duration_seconds": loiter_res["dwell_duration_seconds"],
                                "zone_dwell_seconds": loiter_res["zone_dwell_seconds"]
                            }
                        }
                        generated_events.append(event_obj)

                # Rule 4: Stationary Person Detection
                if loiter_res["is_stationary"]:
                    event_type = "STATIONARY_PERSON"
                    if not self.cooldown.is_in_cooldown(camera_id, track_id, event_type, now_epoch):
                        self.cooldown.record_event(camera_id, track_id, event_type, now_epoch)
                        event_id = f"EVT-STAT-{uuid.uuid4().hex[:8].upper()}"

                        event_obj = {
                            "event_id": event_id,
                            "camera_id": camera_id,
                            "track_id": track_id,
                            "event_type": event_type,
                            "severity": EventRulesConfig.get_severity(event_type),
                            "confidence": confidence,
                            "description": f"Person observed stationary (stationary: {loiter_res['stationary_duration_seconds']}s, displacement: {loiter_res['displacement_px']}px)",
                            "bbox": bbox,
                            "timestamp": now_iso,
                            "metadata": {
                                "rule": "STATIONARY_BEHAVIOR",
                                "stationary_duration_seconds": loiter_res["stationary_duration_seconds"],
                                "displacement_px": loiter_res["displacement_px"]
                            }
                        }
                        generated_events.append(event_obj)

            # =========================================================================
            # Rule 3: Night Movement Detection
            # =========================================================================
            if is_night_frame and object_type == "person":
                event_type = "NIGHT_MOVEMENT"
                if not self.cooldown.is_in_cooldown(camera_id, track_id, event_type, now_epoch):
                    self.cooldown.record_event(camera_id, track_id, event_type, now_epoch)
                    event_id = f"EVT-NGT-{uuid.uuid4().hex[:8].upper()}"

                    event_obj = {
                        "event_id": event_id,
                        "camera_id": camera_id,
                        "track_id": track_id,
                        "event_type": event_type,
                        "severity": EventRulesConfig.get_severity(event_type),
                        "confidence": confidence,
                        "description": "Person movement detected during low-light/night conditions",
                        "bbox": bbox,
                        "timestamp": now_iso,
                        "metadata": {
                            "rule": "LOW_LIGHT_AMBIENT_DETECTION",
                            "frame_brightness": night_eval["brightness"],
                            "brightness_threshold": night_eval["threshold"]
                        }
                    }
                    generated_events.append(event_obj)

        # 2. Persist Events & Alerts to Supabase
        if persist_to_db and generated_events:
            self._persist_events_and_alerts(generated_events)

        return generated_events

    def _persist_events_and_alerts(self, events: List[Dict[str, Any]]):
        """
        Synchronizes generated security events and alerts with Supabase tables.
        """
        for evt in events:
            try:
                # 1. Write to Supabase events table
                event_record = {
                    "id": evt["event_id"],
                    "event_type": evt["event_type"],
                    "object_type": "PERSON",
                    "confidence": evt["confidence"],
                    "camera_id": evt["camera_id"],
                    "camera_name": f"Camera {evt['camera_id']}",
                    "location": f"Sector Grid ({evt['camera_id']})",
                    "severity": evt["severity"],
                    "evidence_url": "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80",
                    "timestamp": evt["timestamp"]
                }
                supabase_service.create_event(event_record)

                # 2. If severity is CRITICAL or WARNING (e.g. INTRUSION, LOITERING, NIGHT_MOVEMENT), create an Alert record
                if evt["severity"] in ("CRITICAL", "WARNING"):
                    alert_record = {
                        "id": f"ALT-{evt['event_id'].replace('EVT-', '')}",
                        "alert_type": evt["event_type"].replace("_", " ").title(),
                        "severity": evt["severity"],
                        "camera_id": evt["camera_id"],
                        "location": f"Sector Grid ({evt['camera_id']})",
                        "description": evt["description"],
                        "status": "ACTIVE",
                        "evidence_url": "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80",
                        "detected_at": evt["timestamp"],
                        "created_at": evt["timestamp"]
                    }
                    supabase_service.create_alert(alert_record)

            except Exception as e:
                logger.error(f"Error persisting event {evt.get('event_id')} to Supabase: {e}")


# Global singleton engine
event_engine = EventDetectionEngine()
