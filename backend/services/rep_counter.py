"""
In-memory session state and rep-counting logic per workout type.
"""
from typing import Optional

from .pose_utils import calculate_angle
import numpy as np

# session_states[session_id] = { "reps": int, "stage": str }
session_states: dict[str, dict] = {}

# MediaPipe Pose landmark indices (mp.solutions.pose.PoseLandmark)
class LandmarkIndex:
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_ELBOW = 13
    RIGHT_ELBOW = 14
    LEFT_WRIST = 15
    RIGHT_WRIST = 16
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28


def _get_landmark(landmarks, idx: int) -> Optional[np.ndarray]:
    if landmarks is None or idx < 0 or idx >= len(landmarks):
        return None
    lm = landmarks[idx]
    return np.array([lm.x, lm.y, lm.z], dtype=float)


def _get_angle_shoulder_elbow_wrist(landmarks, side: str) -> Optional[float]:
    if side == "left":
        s, e, w = LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_ELBOW, LandmarkIndex.LEFT_WRIST
    else:
        s, e, w = LandmarkIndex.RIGHT_SHOULDER, LandmarkIndex.RIGHT_ELBOW, LandmarkIndex.RIGHT_WRIST
    a = _get_landmark(landmarks, s)
    b = _get_landmark(landmarks, e)
    c = _get_landmark(landmarks, w)
    if a is None or b is None or c is None:
        return None
    return calculate_angle(a, b, c)


def _get_angle_hip_knee_ankle(landmarks, side: str) -> Optional[float]:
    if side == "left":
        h, k, a = LandmarkIndex.LEFT_HIP, LandmarkIndex.LEFT_KNEE, LandmarkIndex.LEFT_ANKLE
    else:
        h, k, a = LandmarkIndex.RIGHT_HIP, LandmarkIndex.RIGHT_KNEE, LandmarkIndex.RIGHT_ANKLE
    p1 = _get_landmark(landmarks, h)
    p2 = _get_landmark(landmarks, k)
    p3 = _get_landmark(landmarks, a)
    if p1 is None or p2 is None or p3 is None:
        return None
    return calculate_angle(p1, p2, p3)


def _get_plank_alignment_angle(landmarks) -> Optional[float]:
    """Shoulder-hip-ankle alignment (straight line = 180)."""
    s = _get_landmark(landmarks, LandmarkIndex.RIGHT_SHOULDER)
    h = _get_landmark(landmarks, LandmarkIndex.RIGHT_HIP)
    a = _get_landmark(landmarks, LandmarkIndex.RIGHT_ANKLE)
    if s is None or h is None or a is None:
        return None
    return calculate_angle(s, h, a)


def get_angle_for_workout(landmarks, workout_name: str) -> Optional[float]:
    """Return the primary joint angle for the given workout."""
    wn = (workout_name or "").strip() or "Push Up"
    if wn in ("Push Up", "Biceps Curl", "Pull Up", "Shoulder Press"):
        return _get_angle_shoulder_elbow_wrist(landmarks, "right") or _get_angle_shoulder_elbow_wrist(landmarks, "left")
    if wn in ("Squat", "Lunge"):
        return _get_angle_hip_knee_ankle(landmarks, "right") or _get_angle_hip_knee_ankle(landmarks, "left")
    if wn == "Plank":
        return _get_plank_alignment_angle(landmarks)
    # Jumping Jack / default: use elbow angle
    return _get_angle_shoulder_elbow_wrist(landmarks, "right") or _get_angle_shoulder_elbow_wrist(landmarks, "left")


def update_rep_count(session_id: str, angle: float, workout_name: str, target_reps: int) -> tuple[int, str]:
    """
    Update session state and return (reps, stage).
    Push-up style: angle < 70 -> down, angle > 150 and was down -> rep, stage up.
    Squat/Lunge: angle < 90 -> down, angle > 160 and was down -> rep.
    Biceps Curl: similar to push-up (elbow angle).
    Plank: no rep counting; return current reps unchanged.
    """
    if session_id not in session_states:
        session_states[session_id] = {"reps": 0, "stage": "up"}
    state = session_states[session_id]
    reps, stage = state["reps"], state["stage"]
    wn = (workout_name or "").strip() or "Push Up"

    if wn == "Plank":
        return reps, stage

    if wn in ("Push Up", "Biceps Curl", "Pull Up", "Shoulder Press"):
        if angle < 70:
            stage = "down"
        elif angle > 150 and stage == "down":
            reps += 1
            stage = "up"
    elif wn in ("Squat", "Lunge"):
        if angle < 90:
            stage = "down"
        elif angle > 160 and stage == "down":
            reps += 1
            stage = "up"
    else:
        # Jumping Jack / generic: use same as push-up
        if angle < 70:
            stage = "down"
        elif angle > 150 and stage == "down":
            reps += 1
            stage = "up"

    state["reps"] = reps
    state["stage"] = stage
    return reps, stage


def get_session_state(session_id: str) -> dict:
    if session_id not in session_states:
        session_states[session_id] = {"reps": 0, "stage": "up"}
    return session_states[session_id]


def reset_session(session_id: str) -> None:
    if session_id in session_states:
        session_states[session_id] = {"reps": 0, "stage": "up"}
