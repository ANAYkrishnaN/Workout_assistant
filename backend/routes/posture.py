"""
Posture analysis: MediaPipe Pose + rep counting.
"""
import time
import cv2
import numpy as np
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from pydantic import BaseModel

import mediapipe as mp

from services.rep_counter import (
    get_angle_for_workout,
    update_rep_count,
    reset_session,
)

router = APIRouter(prefix="/posture", tags=["posture"])

# MediaPipe Pose (init once)
_pose = mp.solutions.pose.Pose(
    static_image_mode=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)


def _no_pose_response(workout_name: str) -> dict:
    return {
        "detected": False,
        "reps": 0,
        "angle": 0,
        "calories": 0,
        "message": "No body detected",
        "fps": 0,
        "detected_label": workout_name or "",
        "done_by_target": False,
    }


@router.post("/analyze")
async def posture_analyze(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    workout_name: str = Form("Push Up"),
    mode: str = Form("manual"),
    target_reps: int = Form(0),
):
    start = time.perf_counter()
    target_reps = max(0, int(target_reps))

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    np_arr = np.frombuffer(content, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image file")

    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = _pose.process(image_rgb)

    if not results.pose_landmarks:
        return _no_pose_response(workout_name)

    landmarks = results.pose_landmarks.landmark
    angle = get_angle_for_workout(landmarks, workout_name)
    if angle is None:
        return _no_pose_response(workout_name)

    reps, stage = update_rep_count(session_id, angle, workout_name, target_reps)
    calories = round(reps * 0.5, 1)
    processing_time = time.perf_counter() - start
    fps = 1.0 / processing_time if processing_time > 0 else 0
    done_by_target = target_reps > 0 and reps >= target_reps
    message = "Target reached! Great job!" if done_by_target else "Keep going!"
    if done_by_target:
        reset_session(session_id)

    return {
        "detected": True,
        "reps": reps,
        "calories": calories,
        "angle": round(angle, 1),
        "message": message,
        "fps": round(fps, 1),
        "detected_label": workout_name or "Push Up",
        "done_by_target": done_by_target,
    }


class ResetBody(BaseModel):
    session_id: str


@router.post("/reset_session")
async def posture_reset_session(body: ResetBody):
    reset_session(body.session_id)
    return {"success": True}
