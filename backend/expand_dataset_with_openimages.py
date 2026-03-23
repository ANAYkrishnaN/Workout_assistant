"""
Merge selected Open Images classes into Smart Fridge YOLO dataset.

Expected Open Images addon structure (created by OIDv6 downloader):
  backend/databases/openimages_addon/
    metadata/class-descriptions-boxable.csv
    boxes/oidv6-train-annotations-bbox.csv
    boxes/oidv6-validation-annotations-bbox.csv
    boxes/oidv6-test-annotations-bbox.csv
    train/<class_name>/*.jpg
    validation/<class_name>/*.jpg
    test/<class_name>/*.jpg
"""

from __future__ import annotations

import argparse
import csv
import shutil
from collections import defaultdict
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
SMART_FRIDGE_DIR = BASE_DIR / "databases" / "smart_fridge"
OPENIMAGES_DIR = BASE_DIR / "databases" / "openimages_addon"

DEFAULT_CLASSES = ["Banana", "Orange", "Onion", "Cauliflower", "Watermelon"]
SPLIT_MAP = {"train": "train", "validation": "valid", "test": "test"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Merge Open Images classes into smart_fridge YOLO dataset.")
    parser.add_argument(
        "--classes",
        nargs="+",
        default=DEFAULT_CLASSES,
        help="Class names to add from Open Images metadata.",
    )
    parser.add_argument(
        "--smart-fridge-dir",
        default=str(SMART_FRIDGE_DIR),
        help="Path to existing YOLO dataset root.",
    )
    parser.add_argument(
        "--openimages-dir",
        default=str(OPENIMAGES_DIR),
        help="Path to downloaded Open Images addon dataset root.",
    )
    parser.add_argument("--train-per-class-limit", type=int, default=180, help="Max images per imported class for train split.")
    parser.add_argument("--valid-per-class-limit", type=int, default=80, help="Max images per imported class for valid split.")
    parser.add_argument("--test-per-class-limit", type=int, default=120, help="Max images per imported class for test split.")
    parser.add_argument(
        "--train-max-objects-per-class",
        type=int,
        default=500,
        help="Cap imported object annotations per class for train split.",
    )
    parser.add_argument(
        "--reset-openimages-import",
        action="store_true",
        help="Delete previously imported oi_* files from smart_fridge before merge.",
    )
    return parser.parse_args()


def load_data_yaml_names(data_yaml: Path) -> dict[int, str]:
    names: dict[int, str] = {}
    in_names = False
    for raw in data_yaml.read_text(encoding="utf-8").splitlines():
        line = raw.rstrip()
        if line.strip().startswith("names:"):
            in_names = True
            continue
        if in_names:
            if ":" not in line:
                continue
            left, right = line.split(":", 1)
            left = left.strip()
            if left.isdigit():
                names[int(left)] = right.strip()
    return names


def write_data_yaml(data_yaml: Path, names: dict[int, str]) -> None:
    lines = [
        "path: databases/smart_fridge",
        "",
        "train: train/images",
        "val: valid/images",
        "test: test/images",
        "",
        f"nc: {len(names)}",
        "names:",
    ]
    for class_id in sorted(names):
        lines.append(f"  {class_id}: {names[class_id]}")
    lines.extend(
        [
            "",
            "roboflow:",
            "  workspace: personal-2uusc",
            "  project: smart_refrigerator",
            "  version: 2",
            "  license: CC BY 4.0",
            "  url: https://universe.roboflow.com/personal-2uusc/smart_refrigerator/dataset/2",
        ]
    )
    data_yaml.write_text("\n".join(lines) + "\n", encoding="utf-8")


def load_oi_class_map(metadata_csv: Path) -> dict[str, str]:
    """
    Returns mapping from lowercase class name -> LabelName ID (Open Images).
    """
    out: dict[str, str] = {}
    with metadata_csv.open("r", newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < 2:
                continue
            label_id, class_name = row[0].strip(), row[1].strip()
            out[class_name.lower()] = label_id
    return out


def collect_image_ids(
    oi_root: Path,
    split: str,
    class_names: list[str],
    per_class_limit: int = 0,
) -> dict[str, tuple[Path, str]]:
    """
    Returns ImageID -> (absolute image path, class lower name from folder).
    """
    split_dir = oi_root / split
    result: dict[str, tuple[Path, str]] = {}
    for cls in class_names:
        cls_dir = split_dir / cls.lower()
        if not cls_dir.exists():
            continue
        imgs = sorted(cls_dir.glob("*.jpg"))
        if per_class_limit > 0:
            imgs = imgs[:per_class_limit]
        for img in imgs:
            result[img.stem] = (img, cls.lower())
    return result


def read_annotations_for_subset(
    bbox_csv: Path,
    selected_image_ids: set[str],
    selected_label_ids: set[str],
    class_id_map: dict[str, int],
    max_objects_per_class: int = 0,
) -> dict[str, list[str]]:
    """
    Returns ImageID -> list of YOLO label lines.
    """
    labels: dict[str, list[str]] = defaultdict(list)
    class_obj_counts: defaultdict[int, int] = defaultdict(int)
    with bbox_csv.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            image_id = row["ImageID"]
            label_id = row["LabelName"]
            if image_id not in selected_image_ids or label_id not in selected_label_ids:
                continue

            x_min = float(row["XMin"])
            x_max = float(row["XMax"])
            y_min = float(row["YMin"])
            y_max = float(row["YMax"])
            width = x_max - x_min
            height = y_max - y_min
            if width <= 0 or height <= 0:
                continue

            xc = x_min + width / 2.0
            yc = y_min + height / 2.0
            class_id = class_id_map[label_id]
            if max_objects_per_class > 0 and class_obj_counts[class_id] >= max_objects_per_class:
                continue
            labels[image_id].append(f"{class_id} {xc:.6f} {yc:.6f} {width:.6f} {height:.6f}")
            class_obj_counts[class_id] += 1
    return labels


def reset_existing_openimages_import(smart_fridge_dir: Path) -> None:
    removed = 0
    for split in ("train", "valid", "test"):
        img_dir = smart_fridge_dir / split / "images"
        lbl_dir = smart_fridge_dir / split / "labels"
        for pattern in ("oi_*.jpg", "oi_*.png"):
            for p in img_dir.glob(pattern):
                p.unlink(missing_ok=True)
                removed += 1
        for p in lbl_dir.glob("oi_*.txt"):
            p.unlink(missing_ok=True)
            removed += 1
    print(f"Reset imported files: removed {removed} oi_* files.")


def main() -> None:
    args = parse_args()
    smart_fridge_dir = Path(args.smart_fridge_dir)
    oi_root = Path(args.openimages_dir)
    data_yaml = smart_fridge_dir / "data.yaml"
    metadata_csv = oi_root / "metadata" / "class-descriptions-boxable.csv"

    if not data_yaml.exists():
        raise FileNotFoundError(f"Missing data.yaml: {data_yaml}")
    if not metadata_csv.exists():
        raise FileNotFoundError(f"Missing class descriptions file: {metadata_csv}")

    names = load_data_yaml_names(data_yaml)
    next_class_id = (max(names.keys()) + 1) if names else 0

    oi_name_to_id = load_oi_class_map(metadata_csv)
    requested = [c.strip() for c in args.classes if c.strip()]
    missing = [c for c in requested if c.lower() not in oi_name_to_id]
    if missing:
        raise ValueError(f"Classes not found in Open Images metadata: {missing}")

    # Add classes to smart_fridge names if they do not exist yet.
    final_class_ids: dict[str, int] = {}
    existing_lower_to_id = {v.lower(): k for k, v in names.items()}
    for class_name in requested:
        low = class_name.lower()
        if low in existing_lower_to_id:
            final_class_ids[low] = existing_lower_to_id[low]
        else:
            names[next_class_id] = class_name
            final_class_ids[low] = next_class_id
            next_class_id += 1

    write_data_yaml(data_yaml, names)
    print(f"Updated {data_yaml} to {len(names)} classes.")

    if args.reset_openimages_import:
        reset_existing_openimages_import(smart_fridge_dir)

    # Build Open Images label id -> final class id mapping.
    oi_label_to_target_id = {oi_name_to_id[c.lower()]: final_class_ids[c.lower()] for c in requested}
    selected_label_ids = set(oi_label_to_target_id.keys())

    # Merge each split.
    for oi_split, target_split in SPLIT_MAP.items():
        bbox_candidates = [
            oi_root / "boxes" / f"oidv6-{oi_split}-annotations-bbox.csv",
            oi_root / "boxes" / f"{oi_split}-annotations-bbox.csv",
        ]
        bbox_csv = next((p for p in bbox_candidates if p.exists()), None)
        if bbox_csv is None:
            print(f"Skip split '{oi_split}' (missing bbox csv).")
            continue

        per_class_limit = (
            args.train_per_class_limit if oi_split == "train"
            else args.valid_per_class_limit if oi_split == "validation"
            else args.test_per_class_limit
        )
        selected_images = collect_image_ids(oi_root, oi_split, requested, per_class_limit=per_class_limit)
        if not selected_images:
            print(f"Skip split '{oi_split}' (no images found for requested classes).")
            continue

        yolo_lines = read_annotations_for_subset(
            bbox_csv=bbox_csv,
            selected_image_ids=set(selected_images.keys()),
            selected_label_ids=selected_label_ids,
            class_id_map=oi_label_to_target_id,
            max_objects_per_class=args.train_max_objects_per_class if oi_split == "train" else 0,
        )

        images_dst = smart_fridge_dir / target_split / "images"
        labels_dst = smart_fridge_dir / target_split / "labels"
        images_dst.mkdir(parents=True, exist_ok=True)
        labels_dst.mkdir(parents=True, exist_ok=True)

        copied = 0
        for image_id, (src_img, src_class_name) in selected_images.items():
            lines = yolo_lines.get(image_id, [])
            if not lines:
                continue

            dst_stem = f"oi_{src_class_name}_{image_id}"
            dst_img = images_dst / f"{dst_stem}.jpg"
            dst_lbl = labels_dst / f"{dst_stem}.txt"
            shutil.copy2(src_img, dst_img)
            dst_lbl.write_text("\n".join(lines) + "\n", encoding="utf-8")
            copied += 1

        print(f"{oi_split:>10} -> {target_split:>5}: copied {copied} images with labels.")

    print("Open Images merge complete.")


if __name__ == "__main__":
    main()

