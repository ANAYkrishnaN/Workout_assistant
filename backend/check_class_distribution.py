import os
from pathlib import Path
from collections import Counter


BASE = Path(__file__).resolve().parent
DATASET = BASE / "databases" / "smart_fridge"
SPLITS = ("train", "valid", "test")


def load_names() -> dict[int, str]:
    # Keep it simple and robust against YAML parser dependency issues.
    names: dict[int, str] = {}
    data_yaml = DATASET / "data.yaml"
    if not data_yaml.exists():
        return names

    in_names = False
    for raw in data_yaml.read_text(encoding="utf-8").splitlines():
        line = raw.rstrip()
        if line.strip().startswith("names:"):
            in_names = True
            continue
        if in_names:
            if not line.strip() or ":" not in line:
                continue
            # Example: "  13: Tomato"
            left, right = line.split(":", 1)
            left = left.strip()
            if left.isdigit():
                names[int(left)] = right.strip()
    return names


def get_counts(labels_dir: Path) -> tuple[Counter, int]:
    counts: Counter = Counter()
    files = 0
    if not labels_dir.exists():
        return counts, files
    for file in labels_dir.iterdir():
        if file.suffix != ".txt":
            continue
        files += 1
        for line in file.read_text(encoding="utf-8").splitlines():
            parts = line.strip().split()
            if not parts:
                continue
            cls = parts[0]
            counts[cls] += 1
    return counts, files


def print_split_distribution(split: str, names: dict[int, str]) -> None:
    labels_dir = DATASET / split / "labels"
    counts, files = get_counts(labels_dir)
    total = sum(counts.values()) or 1
    print(f"\n{split.upper()} SET")
    print("-" * 40)
    for cls, count in sorted(counts.items(), key=lambda x: int(x[0])):
        class_id = int(cls)
        class_name = names.get(class_id, f"class_{class_id}")
        pct = (count / total) * 100
        print(f"{class_id:>2}  {class_name:<16} {count:>5} objects  ({pct:>5.1f}%)")
    print(f"Files: {files}, Objects: {sum(counts.values())}")


if __name__ == "__main__":
    names = load_names()
    print("Smart Fridge Class Distribution")
    print("=" * 40)
    for split_name in SPLITS:
        print_split_distribution(split_name, names)
