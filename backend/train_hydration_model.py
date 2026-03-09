"""
Train Adaptive Hydration ML model on synthetic physiological data.
Formulas: base = weight * 35; adjustments for temp, humidity, workout, sleep.
Saves backend/models/hydration_model.pkl. Run from backend: python train_hydration_model.py
"""
import os
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score
import joblib

np.random.seed(42)
n_samples = 10_500

# Features: weight (45-120), temperature (5-40), humidity (20-90), workout_minutes (0-120), sleep_hours (4-9)
weight = np.clip(np.random.uniform(45, 120, n_samples), 45, 120)
temperature = np.clip(np.random.uniform(5, 40, n_samples), 5, 40)
humidity = np.clip(np.random.uniform(20, 90, n_samples), 20, 90)
workout_minutes = np.clip(np.random.uniform(0, 120, n_samples), 0, 120)
sleep_hours = np.clip(np.random.uniform(4, 9, n_samples), 4, 9)

# Base hydration (ml)
base = weight * 35

# Temperature adjustment: +12% if > 25°C, +20% if > 32°C (use higher when both apply)
temp_mult = np.where(temperature > 32, 1.20, np.where(temperature > 25, 1.12, 1.0))

# Humidity: +5% if > 70%
hum_mult = np.where(humidity > 70, 1.05, 1.0)

# Workout: + workout_minutes * 8 ml
workout_add = workout_minutes * 8

# Sleep: +150 ml if sleep < 6h
sleep_add = np.where(sleep_hours < 6, 150, 0)

# Adjusted goal (ml)
adjusted = base * temp_mult * hum_mult + workout_add + sleep_add
# Add small noise for realism
adjusted = np.clip(adjusted + np.random.normal(0, 50, n_samples), 1200, 5500)

X = np.column_stack([weight, temperature, humidity, workout_minutes, sleep_hours])
y = adjusted.reshape(-1, 1)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=150, max_depth=14, random_state=42)
model.fit(X_train, y_train.ravel())

y_pred = model.predict(X_test)
r2 = r2_score(y_test.ravel(), y_pred)
print(f"R2 score: {r2:.4f}")

os.makedirs("models", exist_ok=True)
joblib.dump(model, "models/hydration_model.pkl")
print("Model saved to models/hydration_model.pkl")
