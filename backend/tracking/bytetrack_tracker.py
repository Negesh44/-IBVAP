import os
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from dotenv import load_dotenv

load_dotenv()


def bbox_iou(box1: np.ndarray, box2: np.ndarray) -> float:
    """Computes IoU between two bounding boxes [x1, y1, x2, y2]."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter_area = max(0, x2 - x1) * max(0, y2 - y1)
    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])

    union_area = area1 + area2 - inter_area
    if union_area <= 0:
        return 0.0
    return float(inter_area / union_area)


def iou_distance(tracks_boxes: List[np.ndarray], detections_boxes: List[np.ndarray]) -> np.ndarray:
    """Computes cost matrix of 1 - IoU distance."""
    cost_matrix = np.zeros((len(tracks_boxes), len(detections_boxes)), dtype=np.float32)
    for i, track_box in enumerate(tracks_boxes):
        for j, det_box in enumerate(detections_boxes):
            cost_matrix[i, j] = 1.0 - bbox_iou(track_box, det_box)
    return cost_matrix


def linear_assignment(cost_matrix: np.ndarray, threshold: float) -> Tuple[List[Tuple[int, int]], List[int], List[int]]:
    """Greedy bipartite matching based on IoU distance threshold."""
    if cost_matrix.size == 0:
        return [], list(range(cost_matrix.shape[0])), list(range(cost_matrix.shape[1]))

    matches = []
    num_rows, num_cols = cost_matrix.shape
    row_ind = []
    col_ind = []

    cost_copy = cost_matrix.copy()

    while True:
        min_val = np.min(cost_copy)
        if min_val > threshold or np.isinf(min_val):
            break

        idx = np.unravel_index(np.argmin(cost_copy), cost_copy.shape)
        r, c = idx[0], idx[1]
        matches.append((r, c))
        row_ind.append(r)
        col_ind.append(c)

        # Invalidate row and column
        cost_copy[r, :] = np.inf
        cost_copy[:, c] = np.inf

    unmatched_tracks = [r for r in range(num_rows) if r not in row_ind]
    unmatched_detections = [c for c in range(num_cols) if c not in col_ind]

    return matches, unmatched_tracks, unmatched_detections


class KalmanFilterBox:
    """Simple constant-velocity Kalman Filter for 2D bounding boxes [x, y, w, h]."""

    def __init__(self):
        # State vector: [x_center, y_center, width, height, vx, vy, vw, vh]
        self.dim_x = 8
        self.dim_z = 4

        self.F = np.eye(8, dtype=np.float32)
        for i in range(4):
            self.F[i, i + 4] = 1.0  # dt = 1.0 frame

        self.H = np.eye(4, 8, dtype=np.float32)
        self.R = np.eye(4, dtype=np.float32) * 1.0
        self.Q = np.eye(8, dtype=np.float32) * 0.05
        for i in range(4, 8):
            self.Q[i, i] = 0.5

    def initiate(self, measurement: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        mean = np.zeros(8, dtype=np.float32)
        mean[:4] = measurement
        covariance = np.eye(8, dtype=np.float32) * 10.0
        for i in range(4, 8):
            covariance[i, i] = 100.0
        return mean, covariance

    def predict(self, mean: np.ndarray, covariance: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        mean = np.dot(self.F, mean)
        covariance = np.dot(np.dot(self.F, covariance), self.F.T) + self.Q
        return mean, covariance

    def update(self, mean: np.ndarray, covariance: np.ndarray, measurement: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        y = measurement - np.dot(self.H, mean)
        S = np.dot(np.dot(self.H, covariance), self.H.T) + self.R
        K = np.dot(np.dot(covariance, self.H.T), np.linalg.inv(S))
        new_mean = mean + np.dot(K, y)
        new_covariance = covariance - np.dot(np.dot(K, self.H), covariance)
        return new_mean, new_covariance


class STrack:
    """Represents a single tracked object across video frames."""

    _count = 100

    def __init__(self, bbox_xyxy: List[int], confidence: float, class_id: int, object_type: str):
        STrack._count += 1
        self.track_id = STrack._count
        self.class_id = class_id
        self.object_type = object_type
        self.confidence = confidence

        self.kalman = KalmanFilterBox()
        x1, y1, x2, y2 = bbox_xyxy
        w = max(1, x2 - x1)
        h = max(1, y2 - y1)
        cx = x1 + w / 2.0
        cy = y1 + h / 2.0

        self.mean, self.covariance = self.kalman.initiate(np.array([cx, cy, w, h], dtype=np.float32))
        self.state = "Tracked"  # "Tracked", "Lost", "Removed"
        self.time_since_update = 0
        self.hits = 1
        self.age = 1

    @classmethod
    def reset_counter(cls, start_id: int = 100):
        cls._count = start_id

    def predict(self):
        self.mean, self.covariance = self.kalman.predict(self.mean, self.covariance)
        self.age += 1
        self.time_since_update += 1

    def update(self, bbox_xyxy: List[int], confidence: float):
        x1, y1, x2, y2 = bbox_xyxy
        w = max(1, x2 - x1)
        h = max(1, y2 - y1)
        cx = x1 + w / 2.0
        cy = y1 + h / 2.0

        self.mean, self.covariance = self.kalman.update(
            self.mean, self.covariance, np.array([cx, cy, w, h], dtype=np.float32)
        )
        self.confidence = confidence
        self.time_since_update = 0
        self.hits += 1
        self.state = "Tracked"

    def to_xyxy(self) -> List[int]:
        cx, cy, w, h = self.mean[:4]
        x1 = int(round(cx - w / 2.0))
        y1 = int(round(cy - h / 2.0))
        x2 = int(round(cx + w / 2.0))
        y2 = int(round(cy + h / 2.0))
        return [x1, y1, x2, y2]


class ByteTrackTracker:
    """
    ByteTrack Multi-Object Tracker.
    Maintains persistent track IDs by associating both high-score and low-score detections.
    """

    def __init__(
        self,
        track_thresh: Optional[float] = None,
        track_buffer: Optional[int] = None,
        match_thresh: Optional[float] = None
    ):
        self.track_thresh = track_thresh if track_thresh is not None else float(os.getenv("TRACKER_TRACK_THRESH", "0.40"))
        self.track_buffer = track_buffer if track_buffer is not None else int(os.getenv("TRACKER_TRACK_BUFFER", "30"))
        self.match_thresh = match_thresh if match_thresh is not None else float(os.getenv("TRACKER_MATCH_THRESH", "0.80"))

        self.tracked_stracks: List[STrack] = []
        self.lost_stracks: List[STrack] = []
        self.frame_id = 0

    def reset(self):
        """Resets tracker state for this camera stream."""
        self.tracked_stracks = []
        self.lost_stracks = []
        self.frame_id = 0

    def update(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Updates tracking state using the current frame's YOLO detections.

        Input detections:
        [
            {
                "class_id": 0,
                "object_type": "person",
                "confidence": 0.96,
                "bbox": [x1, y1, x2, y2]
            }
        ]

        Output tracked objects:
        [
            {
                "track_id": 104,
                "class_id": 0,
                "object_type": "person",
                "confidence": 0.96,
                "bbox": [x1, y1, x2, y2]
            }
        ]
        """
        self.frame_id += 1

        # Step 1: Predict new locations of existing tracks using Kalman Filter
        for track in self.tracked_stracks:
            track.predict()
        for track in self.lost_stracks:
            track.predict()

        # Step 2: Separate high confidence and low confidence detections
        high_dets: List[Dict[str, Any]] = []
        low_dets: List[Dict[str, Any]] = []

        for d in detections:
            conf = float(d.get("confidence", 0.0))
            if conf >= self.track_thresh:
                high_dets.append(d)
            elif conf >= 0.10:
                low_dets.append(d)

        # -------------------------------------------------------------
        # Association Step 1: Match high-confidence detections with active tracks
        # -------------------------------------------------------------
        active_pool = self.tracked_stracks + self.lost_stracks
        active_boxes = [np.array(t.to_xyxy(), dtype=np.float32) for t in active_pool]
        high_boxes = [np.array(d["bbox"], dtype=np.float32) for d in high_dets]

        matches_1, unmatched_tracks_1, unmatched_high_dets = linear_assignment(
            iou_distance(active_boxes, high_boxes),
            threshold=1.0 - self.match_thresh
        )

        for track_idx, det_idx in matches_1:
            track = active_pool[track_idx]
            det = high_dets[det_idx]
            track.update(det["bbox"], det["confidence"])
            if track in self.lost_stracks:
                self.lost_stracks.remove(track)
            if track not in self.tracked_stracks:
                self.tracked_stracks.append(track)

        # -------------------------------------------------------------
        # Association Step 2: Match remaining unmatched active tracks with low-confidence detections
        # (Key ByteTrack innovation: recovers temporarily occluded or blurred targets)
        # -------------------------------------------------------------
        unmatched_active_tracks = [active_pool[i] for i in unmatched_tracks_1 if active_pool[i].state == "Tracked"]
        unmatched_active_boxes = [np.array(t.to_xyxy(), dtype=np.float32) for t in unmatched_active_tracks]
        low_boxes = [np.array(d["bbox"], dtype=np.float32) for d in low_dets]

        matches_2, unmatched_tracks_2, _ = linear_assignment(
            iou_distance(unmatched_active_boxes, low_boxes),
            threshold=0.5
        )

        for track_idx, det_idx in matches_2:
            track = unmatched_active_tracks[track_idx]
            det = low_dets[det_idx]
            track.update(det["bbox"], det["confidence"])
            if track in self.lost_stracks:
                self.lost_stracks.remove(track)
            if track not in self.tracked_stracks:
                self.tracked_stracks.append(track)

        # Mark remaining unmatched tracks as lost
        for i in unmatched_tracks_2:
            track = unmatched_active_tracks[i]
            track.state = "Lost"
            if track in self.tracked_stracks:
                self.tracked_stracks.remove(track)
            if track not in self.lost_stracks:
                self.lost_stracks.append(track)

        # -------------------------------------------------------------
        # Step 3: Initialize new tracks from unmatched high-confidence detections
        # -------------------------------------------------------------
        for i in unmatched_high_dets:
            det = high_dets[i]
            new_track = STrack(
                bbox_xyxy=det["bbox"],
                confidence=det["confidence"],
                class_id=det["class_id"],
                object_type=det["object_type"]
            )
            self.tracked_stracks.append(new_track)

        # Step 4: Remove lost tracks that exceed track_buffer frames
        self.lost_stracks = [
            t for t in self.lost_stracks if t.time_since_update <= self.track_buffer
        ]

        # -------------------------------------------------------------
        # Build Output
        # -------------------------------------------------------------
        output_tracks: List[Dict[str, Any]] = []
        for track in self.tracked_stracks:
            output_tracks.append({
                "track_id": track.track_id,
                "class_id": track.class_id,
                "object_type": track.object_type,
                "confidence": round(float(track.confidence), 2),
                "bbox": track.to_xyxy()
            })

        return output_tracks
