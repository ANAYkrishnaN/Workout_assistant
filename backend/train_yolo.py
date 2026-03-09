"""
YOLOv8 training script for Smart Fridge dataset.
Dataset: 15 classes, 712 train images. Tuned for GTX 1650 (4GB VRAM) and class imbalance.
Run from project root: python backend/train_yolo.py
Or from backend: python train_yolo.py
"""

import os
from pathlib import Path

import torch
from ultralytics import YOLO


# -----------------------------------------------------------------------------
# Paths (resolve relative to this file so it works from any cwd)
# -----------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent
DATA_YAML = BACKEND_DIR / "databases" / "smart_fridge" / "data.yaml"
PROJECT_DIR = BACKEND_DIR / "runs" / "detect"
MODEL_NAME = "yolov8n.pt"


def get_gpu_name() -> str:
    """Return GPU name if CUDA is available, else 'CPU'."""
    if torch.cuda.is_available():
        return torch.cuda.get_device_name(0)
    return "CPU"


def main() -> None:
    if not DATA_YAML.exists():
        raise FileNotFoundError(f"Dataset config not found: {DATA_YAML}")

    # Run from backend dir so data.yaml relative paths (e.g. train/images) resolve correctly
    os.chdir(BACKEND_DIR)
    data_str = "databases/smart_fridge/data.yaml"

    gpu_name = get_gpu_name()
    print(f"GPU: {gpu_name}")
    print(f"Data: {data_str}")
    print(f"Project: {PROJECT_DIR}\n")

    model = YOLO(MODEL_NAME)

    results = model.train(
        data=data_str,
        epochs=60,
        time=3,
        imgsz=512,
        batch=4,
        optimizer="AdamW",
        cos_lr=True,
        patience=20,
        plots=True,
        project=str(PROJECT_DIR),
        name="smart_fridge",
        exist_ok=True,
        # Strong augmentation (helps minority classes)
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=10,
        translate=0.1,
        scale=0.5,
        fliplr=0.5,
        mosaic=1.0,
    )

    print("\nTraining finished.")
    print(f"Best weights: {results.save_dir / 'weights' / 'best.pt'}")


if __name__ == "__main__":
    main()
