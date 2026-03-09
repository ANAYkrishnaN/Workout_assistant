"""
Train a diet macro prediction model (RandomForestRegressor) on synthetic data.
Saves model to models/diet_model.pkl. Run: python train_diet_model.py
"""
import os
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score
import joblib

# Encoding: gender 0=female, 1=male; goal 0=maintenance, 1=weight_loss, 2=muscle_gain
np.random.seed(42)
n_samples = 2000

gender = np.random.randint(0, 2, size=n_samples)
weight = np.clip(np.random.normal(75, 15, n_samples), 40, 150)
height = np.clip(np.random.normal(170, 10, n_samples), 140, 210)
goal = np.random.randint(0, 3, size=n_samples)

# Synthetic targets (formula-like for consistency)
# Fix ambiguous conditional logic for BMR calculation
bmr = 10 * weight + 6.25 * height - 5 * (25 + gender * 5) + np.where(gender == 1, 5, -161)
total_calories = np.clip(
    bmr * np.where(goal == 0, 1.2, np.where(goal == 1, 0.85, 1.35)) + np.random.normal(0, 80, n_samples),
    1200, 3500
)
protein = np.clip(weight * (1.2 + goal * 0.3) + np.random.normal(0, 10, n_samples), 50, 250)
carbs = np.clip(total_calories * 0.45 / 4 + np.random.normal(0, 20, n_samples), 100, 400)
fats = np.clip(total_calories * 0.28 / 9 + np.random.normal(0, 8, n_samples), 30, 120)

X = np.column_stack([gender, weight, height, goal])
y = np.column_stack([total_calories, protein, carbs, fats])

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
r2 = r2_score(y_test, y_pred)
print(f"R2 score: {r2:.4f}")

os.makedirs("models", exist_ok=True)
joblib.dump(model, "models/diet_model.pkl")
print("Model saved to models/diet_model.pkl")
