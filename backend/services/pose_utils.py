"""
Pose utilities: angle calculation from 3D landmarks.
"""
import numpy as np


def calculate_angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """
    Compute angle at b formed by vectors (b -> a) and (b -> c).
    Uses numpy arctan2. Output in range [0, 180] degrees.
    """
    a = np.array(a, dtype=float)
    b = np.array(b, dtype=float)
    c = np.array(c, dtype=float)
    ba = a - b
    bc = c - b
    n_ba = np.linalg.norm(ba) + 1e-8
    n_bc = np.linalg.norm(bc) + 1e-8
    dot = np.dot(ba, bc)
    cross_norm = np.linalg.norm(np.cross(ba, bc))
    angle_rad = np.arctan2(cross_norm, dot)
    angle_deg = np.degrees(np.abs(angle_rad))
    return float(np.clip(angle_deg, 0.0, 180.0))
