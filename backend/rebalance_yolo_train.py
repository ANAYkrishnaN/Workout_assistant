"""
Rebalance YOLO train split by augmenting minority classes.

This script creates additional train image/label pairs for classes below target count.
It keeps validation/test untouched.
"""

from __future__ import annotations

import argparse
import random
from collections import Counter, defaultdict
from pathlib import Path

import cv2


BASE_DIR = Path(__file__).resolve().parent
TRAIN_IMAGES = BASE_DIR / "databases" / "smart_fridge" / "train" / "images"
TRAIN_LABELS = BASE_DIR / "databases" / "smart_fridge" / "train" / "labels"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Rebalance train split by augmenting minority classes.")
    parser.add_argument("--target-count", type=int, default=260, help="Minimum object count per class after rebalance.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed.")
    parser.add_argument("--max-new-per-class", type=int, default=300, help="Safety cap for generated images per class.")
    return parser.parse_args()


def parse_yolo_label(path: Path) -> list[list[float]]:
    rows: list[list[float]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        parts = line.split()
        if len(parts) != 5:
            continue
        cls = int(parts[0])
        xc, yc, w, h = map(float, parts[1:])
        rows.append([cls, xc, yc, w, h])
    return rows


def write_yolo_label(path: Path, rows: list[list[float]]) -> None:
    out = []
    for cls, xc, yc, w, h in rows:
        out.append(f"{int(cls)} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}")
    path.write_text("\n".join(out) + "\n", encoding="utf-8")


def augment_image_and_labels(img, rows: list[list[float]], rng: random.Random):
    aug = img.copy()
    new_rows = [r[:] for r in rows]

    # Horizontal flip
    if rng.random() < 0.5:
        aug = cv2.flip(aug, 1)
        for r in new_rows:
            r[1] = 1.0 - r[1]

    # Brightness/contrast jitter
    alpha = rng.uniform(0.85, 1.2)  # contrast
    beta = rng.uniform(-18, 18)  # brightness offset
    aug = cv2.convertScaleAbs(aug, alpha=alpha, beta=beta)

    # Mild blur
    if rng.random() < 0.25:
        aug = cv2.GaussianBlur(aug, (3, 3), 0)

    return aug, new_rows


def main() -> None:
    args = parse_args()
    rng = random.Random(args.seed)

    if not TRAIN_IMAGES.exists() or not TRAIN_LABELS.exists():
        raise FileNotFoundError("Train images/labels folders not found.")

    label_files = sorted(TRAIN_LABELS.glob("*.txt"))
    if not label_files:
        raise RuntimeError("No train label files found.")

    class_counts: Counter = Counter()
    files_by_class: dict[int, list[Path]] = defaultdict(list)
    label_cache: dict[Path, list[list[float]]] = {}

    for lbl in label_files:
        rows = parse_yolo_label(lbl)
        if not rows:
            continue
        label_cache[lbl] = rows
        classes_in_file = set()
        for cls, *_ in rows:
            class_counts[cls] += 1
            classes_in_file.add(cls)
        for cls in classes_in_file:
            files_by_class[cls].append(lbl)

    print("Before rebalance class counts:", dict(sorted(class_counts.items())))

    generated_total = 0
    for cls in sorted(class_counts.keys()):
        current = class_counts[cls]
        if current >= args.target_count:
            continue

        need = min(args.target_count - current, args.max_new_per_class)
        candidates = files_by_class.get(cls, [])
        if not candidates:
            continue

        created = 0
        while created < need:
            src_lbl = rng.choice(candidates)
            src_rows = label_cache[src_lbl]
            src_img = TRAIN_IMAGES / f"{src_lbl.stem}.jpg"
            if not src_img.exists():
                src_img = TRAIN_IMAGES / f"{src_lbl.stem}.png"
            if not src_img.exists():
                continue

            img = cv2.imread(str(src_img))
            if img is None:
                continue

            aug_img, aug_rows = augment_image_and_labels(img, src_rows, rng)
            new_stem = f"reb_cls{cls}_{created:04d}_{src_lbl.stem}"
            dst_img = TRAIN_IMAGES / f"{new_stem}.jpg"
            dst_lbl = TRAIN_LABELS / f"{new_stem}.txt"

            ok = cv2.imwrite(str(dst_img), aug_img)
            if not ok:
                continue
            write_yolo_label(dst_lbl, aug_rows)

            for r_cls, *_ in aug_rows:
                class_counts[int(r_cls)] += 1
            created += 1
            generated_total += 1

        print(f"Class {cls}: generated {created} augmented samples.")

    print("After rebalance class counts:", dict(sorted(class_counts.items())))
    print(f"Generated total augmented train images: {generated_total}")


if __name__ == "__main__":
    main()

