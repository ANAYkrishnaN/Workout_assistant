"""
YOLOv8 training script for Smart Fridge dataset.

Goal: produce a stronger custom best.pt (used by /detect).

Usage examples:
  python backend/train_yolo.py --model yolov8s.pt --epochs 120
  python backend/train_yolo.py --model yolov8m.pt --epochs 150 --batch 2
  python backend/train_yolo.py --resume
"""

import os
import argparse
from pathlib import Path

import torch
from ultralytics import YOLO


# -----------------------------------------------------------------------------
# Paths (resolve relative to this file so it works from any cwd)
# -----------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent
DATA_YAML = BACKEND_DIR / "databases" / "smart_fridge" / "data.yaml"
PROJECT_DIR = BACKEND_DIR / "runs" / "detect"
DEFAULT_MODEL_NAME = "yolov8s.pt"


def get_gpu_name() -> str:
    """Return GPU name if CUDA is available, else 'CPU'."""
    if torch.cuda.is_available():
        return torch.cuda.get_device_name(0)
    return "CPU"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train custom YOLO model for fridge detection.")
    parser.add_argument("--model", default=DEFAULT_MODEL_NAME, help="Base YOLO model checkpoint.")
    parser.add_argument("--epochs", type=int, default=120, help="Training epochs.")
    parser.add_argument("--imgsz", type=int, default=640, help="Input image size.")
    parser.add_argument("--batch", type=int, default=4, help="Batch size (lower for low VRAM GPUs).")
    parser.add_argument("--patience", type=int, default=35, help="Early stopping patience.")
    parser.add_argument("--workers", type=int, default=4, help="Dataloader workers.")
    parser.add_argument("--fraction", type=float, default=1.0, help="Fraction of dataset to use (0.0-1.0).")
    parser.add_argument("--time-hours", type=float, default=0.0, help="Optional wall-time limit for training in hours.")
    parser.add_argument("--skip-export", action="store_true", help="Skip ONNX export to save time.")
    parser.add_argument("--resume", action="store_true", help="Resume last run in smart_fridge.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if not DATA_YAML.exists():
        raise FileNotFoundError(f"Dataset config not found: {DATA_YAML}")

    # Run from backend dir so data.yaml relative paths (e.g. train/images) resolve correctly
    os.chdir(BACKEND_DIR)
    data_str = "databases/smart_fridge/data.yaml"

    gpu_name = get_gpu_name()
    print(f"GPU: {gpu_name}")
    print(f"Data: {data_str}")
    print(f"Project: {PROJECT_DIR}\n")

    run_name = "smart_fridge"
    run_dir = PROJECT_DIR / run_name
    last_ckpt = run_dir / "weights" / "last.pt"
    best_ckpt = run_dir / "weights" / "best.pt"

    if args.resume and last_ckpt.exists():
        print(f"Resuming from: {last_ckpt}")
        model = YOLO(str(last_ckpt))
    else:
        print(f"Starting new training from base model: {args.model}")
        model = YOLO(args.model)

    results = model.train(
        data=data_str,
        epochs=args.epochs,
        time=(args.time_hours if args.time_hours > 0 else None),
        fraction=max(0.05, min(1.0, args.fraction)),
        imgsz=args.imgsz,
        batch=args.batch,
        optimizer="AdamW",
        lr0=0.002,
        lrf=0.01,
        cos_lr=True,
        patience=args.patience,
        workers=args.workers,
        plots=True,
        project=str(PROJECT_DIR),
        name=run_name,
        exist_ok=True,
        # Augmentation profile tuned for cluttered fridge scenes.
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=10,
        translate=0.1,
        scale=0.5,
        fliplr=0.5,
        mosaic=1.0,
        close_mosaic=10,
        mixup=0.2,
        copy_paste=0.2,
        erasing=0.2,
        # Keep confidence sane for validation metrics.
        conf=0.25,
    )

    print("\nTraining finished.")
    print(f"Best weights: {results.save_dir / 'weights' / 'best.pt'}")

    # Validate best checkpoint explicitly and export ONNX for deployment options.
    if best_ckpt.exists():
        print(f"\nRunning validation on: {best_ckpt}")
        best_model = YOLO(str(best_ckpt))
        metrics = best_model.val(data=data_str, imgsz=args.imgsz, batch=args.batch)
        print("Validation metrics:", metrics.results_dict if hasattr(metrics, "results_dict") else metrics)

        if args.skip_export:
            print("\nSkipping ONNX export (--skip-export).")
        else:
            print("\nExporting ONNX...")
            exported = best_model.export(format="onnx", dynamic=True, simplify=True)
            print(f"ONNX exported to: {exported}")
    else:
        print("\nWarning: best.pt not found after training; skipping val/export.")


if __name__ == "__main__":
    main()
