import os
from collections import Counter

labels_path = "databases/smart_fridge/train/labels"

class_counts = Counter()

for file in os.listdir(labels_path):
    if file.endswith(".txt"):
        with open(os.path.join(labels_path, file), "r") as f:
            for line in f:
                class_id = line.strip().split()[0]
                class_counts[class_id] += 1

print("Class Distribution (Train Set):")
for cls, count in sorted(class_counts.items(), key=lambda x: int(x[0])):
    print(f"Class {cls}: {count} objects")

print(f"\nTotal files processed: {len([f for f in os.listdir(labels_path) if f.endswith('.txt')])}")
