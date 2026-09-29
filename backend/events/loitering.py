import math
import time
import logging
from typing import Dict, Tuple, Optional, Any, List
from events.event_rules import EventRulesConfig

logger = logging.getLogger("ibvap.loitering")


class LoiteringDetector:
    """
    Monitors target dwell duration, spatial displacement, and loitering behaviors.
    """

    def __init__(
        self,
        loitering_threshold_seconds: Optional[float] = None,
        stationary_threshold_seconds: Optional[float] = None,
        stationary_displacement_px: Optional[float] = None
    ):
        self.loitering_threshold = loitering_threshold_seconds or EventRulesConfig.LOITERING_THRESHOLD_SECONDS
        self.stationary_threshold = stationary_threshold_seconds or EventRulesConfig.STATIONARY_THRESHOLD_SECONDS
        self.stationary_disp_px = stationary_displacement_px or EventRulesConfig.STATIONARY_DISPLACEMENT_PX

        # (camera_id, track_id) -> state dict
        # {
        #   "first_seen": float,
        #   "last_seen": float,
        #   "anchor_pos": (x, y),
        #   "current_pos": (x, y),
        #   "zone_dwell_start": Optional[float]
        # }
        self._tracks: Dict[Tuple[str, int], Dict[str, Any]] = {}

    def _get_centroid(self, bbox: List[int]) -> Tuple[float, float]:
        x1, y1, x2, y2 = bbox
        return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)

    def update_track(
        self,
        camera_id: str,
        track_id: int,
        bbox: List[int],
        is_inside_zone: bool = False,
        current_time: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Updates the track's temporal and spatial state.
        Returns evaluation flags:
          - is_loitering: bool
          - is_stationary: bool
          - dwell_duration_seconds: float
          - displacement_px: float
        """
        now = current_time if current_time is not None else time.time()
        centroid = self._get_centroid(bbox)
        key = (camera_id, track_id)

        if key not in self._tracks:
            self._tracks[key] = {
                "first_seen": now,
                "last_seen": now,
                "anchor_pos": centroid,
                "anchor_time": now,
                "current_pos": centroid,
                "zone_dwell_start": now if is_inside_zone else None,
            }
            state = self._tracks[key]
        else:
            state = self._tracks[key]
            state["last_seen"] = now
            state["current_pos"] = centroid

            if is_inside_zone and state["zone_dwell_start"] is None:
                state["zone_dwell_start"] = now
            elif not is_inside_zone:
                # Target left zone -> reset zone dwell start
                state["zone_dwell_start"] = None

        # 1. Evaluate Total Dwell / Zone Dwell Time
        dwell_duration = now - state["first_seen"]
        zone_dwell_duration = (now - state["zone_dwell_start"]) if state["zone_dwell_start"] is not None else 0.0

        # Loitering triggered if total dwell or zone dwell exceeds threshold
        is_loitering = (
            zone_dwell_duration >= self.loitering_threshold
            if is_inside_zone
            else dwell_duration >= self.loitering_threshold
        )

        # 2. Evaluate Stationary Behavior
        anchor_x, anchor_y = state["anchor_pos"]
        cur_x, cur_y = centroid
        displacement = math.sqrt((cur_x - anchor_x) ** 2 + (cur_y - anchor_y) ** 2)

        # If target has moved beyond threshold, reset anchor position and time
        if displacement > self.stationary_disp_px:
            state["anchor_pos"] = centroid
            state["anchor_time"] = now
            stationary_duration = 0.0
            is_stationary = False
        else:
            stationary_duration = now - state.get("anchor_time", now)
            is_stationary = stationary_duration >= self.stationary_threshold

        return {
            "dwell_duration_seconds": round(dwell_duration, 2),
            "zone_dwell_seconds": round(zone_dwell_duration, 2),
            "stationary_duration_seconds": round(stationary_duration if not (displacement > self.stationary_disp_px) else 0.0, 2),
            "displacement_px": round(displacement, 2),
            "is_loitering": is_loitering,
            "is_stationary": is_stationary
        }

    def cleanup_stale_tracks(self, max_age_seconds: float = 120.0, current_time: Optional[float] = None):
        """Removes tracks that haven't received updates for max_age_seconds."""
        now = current_time if current_time is not None else time.time()
        stale_keys = [
            k for k, v in self._tracks.items()
            if (now - v["last_seen"]) > max_age_seconds
        ]
        for k in stale_keys:
            del self._tracks[k]

    def reset_track(self, camera_id: str, track_id: int):
        self._tracks.pop((camera_id, track_id), None)

    def reset_camera(self, camera_id: str):
        keys = [k for k in self._tracks.keys() if k[0] == camera_id]
        for k in keys:
            del self._tracks[k]


# Global singleton loitering detector
loitering_detector = LoiteringDetector()
