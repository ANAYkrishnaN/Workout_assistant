"""
FastAPI app: YOLO /detect (Smart Fridge best.pt) + ML /predict-diet + /predict-hydration.
Run from backend dir: uvicorn main:app --reload
"""
import io
import os
import json
import numpy as np
import cv2
import urllib.request
import urllib.error
import urllib.parse
import joblib
import sklearn

print("SKLEARN VERSION:", sklearn.__version__)

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal
from ultralytics import YOLO

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
YOLO_MODEL_PATH = os.path.join(BASE_DIR, "runs", "detect", "smart_fridge", "weights", "best.pt")
if not os.path.isfile(YOLO_MODEL_PATH):
    raise FileNotFoundError(f"YOLO model not found: {YOLO_MODEL_PATH}")
yolo_model = YOLO(YOLO_MODEL_PATH)
print("YOLO model loaded successfully")

MODEL_PATH = os.path.join(BASE_DIR, "models", "diet_model.pkl")
print("Loading model from:", os.path.abspath(MODEL_PATH))


class PredictHydrationRequest(BaseModel):
    weight: float
    temperature: float | None = None
    humidity: float | None = None
    workout_minutes: float = 0
    sleep_hours: float = 7
    city: str | None = None
    workout_intensity: Literal["none", "light", "moderate", "intense"] = "none"
    detected_workout_type: str | None = None  # from posture: "Lower Body", "Upper Body", "Cardio"


class PredictHydrationResponse(BaseModel):
    base_goal: float
    adjusted_goal: float
    adjustments: list[str]
    adjustment_breakdown: list[dict] = []
    explanation: str = ""

app = FastAPI()

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Posture (MediaPipe) router
from routes.posture import router as posture_router
app.include_router(posture_router)

# Diet model (loaded at startup, fallback if missing)
diet_model = None
if os.path.isfile(MODEL_PATH):
    diet_model = joblib.load(MODEL_PATH)
else:
    print("Warning: models/diet_model.pkl not found. /predict-diet will return defaults.")

# Hydration model (loaded at startup, fallback if missing)
hydration_model = None
HYDRATION_MODEL_PATH = os.path.join(BASE_DIR, "models", "hydration_model.pkl")
if os.path.isfile(HYDRATION_MODEL_PATH):
    hydration_model = joblib.load(HYDRATION_MODEL_PATH)
else:
    print("Warning: models/hydration_model.pkl not found. /predict-hydration will use formula fallback.")

OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY", "")


def _fetch_weather_openweather(city: str) -> tuple[float, float] | None:
    """Fetch temp (°C) and humidity (%) from OpenWeather. Returns (temp, humidity) or None on error."""
    if not OPENWEATHER_API_KEY or not city or not city.strip():
        return None
    try:
        url = (
            "https://api.openweathermap.org/data/2.5/weather?"
            f"q={urllib.parse.quote(city.strip())}&appid={OPENWEATHER_API_KEY}&units=metric"
        )
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        temp = float(data.get("main", {}).get("temp", 22))
        humidity = float(data.get("main", {}).get("humidity", 50))
        return (round(temp, 1), round(humidity, 0))
    except (urllib.error.URLError, json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
        print("OpenWeather fetch error:", e)
        return None


class PredictDietRequest(BaseModel):
    gender: Literal["male", "female"]
    weight: float
    height: float
    goal: Literal["maintenance", "weight_loss", "muscle_gain"]


class PredictDietResponse(BaseModel):
    totalCalories: float
    protein: float
    carbs: float
    fats: float


def _encode(gender: str, goal: str) -> tuple[int, int]:
    g = 1 if gender == "male" else 0
    goal_map = {"maintenance": 0, "weight_loss": 1, "muscle_gain": 2}
    goal_enc = goal_map.get(goal, 0)
    return g, goal_enc


@app.post("/predict-diet", response_model=PredictDietResponse)
def predict_diet(req: PredictDietRequest):
    if diet_model is None:
        return PredictDietResponse(
            totalCalories=2000,
            protein=120,
            carbs=200,
            fats=65,
        )
    g, goal_enc = _encode(req.gender, req.goal)
    X = [[g, req.weight, req.height, goal_enc]]
    pred = diet_model.predict(X)[0]
    total_cal, protein, carbs, fats = pred[0], pred[1], pred[2], pred[3]
    return PredictDietResponse(
        totalCalories=round(float(total_cal), 0),
        protein=round(float(protein), 0),
        carbs=round(float(carbs), 0),
        fats=round(float(fats), 0),
    )


@app.post("/predict-hydration", response_model=PredictHydrationResponse)
def predict_hydration(req: PredictHydrationRequest):
    # Resolve temperature and humidity: fetch from OpenWeather if city + key, else use request
    temperature = req.temperature
    humidity = req.humidity
    if req.city and OPENWEATHER_API_KEY:
        weather = _fetch_weather_openweather(req.city)
        if weather is not None:
            temperature, humidity = weather
    if temperature is None:
        temperature = 22.0
    if humidity is None:
        humidity = 50.0

    # Base water = weight * 35 ml
    base_goal = round(float(req.weight * 35), 0)
    adjusted_goal = float(base_goal)
    adjustments = []
    breakdown = []
    reasons = []

    # Temp: > 30°C → +700ml, > 25°C → +400ml
    if temperature > 30:
        adjusted_goal += 700
        adjustments.append("Warm weather adjustment")
        breakdown.append({"label": "Hot weather", "amount": 700})
        reasons.append("hot weather")
    elif temperature > 25:
        adjusted_goal += 400
        adjustments.append("Warm weather adjustment")
        breakdown.append({"label": "Warm weather", "amount": 400})
        reasons.append("warm weather")

    # Humidity > 70% → +250ml
    if humidity > 70:
        adjusted_goal += 250
        adjustments.append("High humidity adjustment")
        breakdown.append({"label": "High humidity", "amount": 250})
        reasons.append("high humidity")

    # Manual workout intensity: Light +250, Moderate +500, Intense +750
    if req.workout_intensity == "light":
        adjusted_goal += 250
        adjustments.append("Workout adjustment")
        breakdown.append({"label": "Light workout", "amount": 250})
        reasons.append("activity level")
    elif req.workout_intensity == "moderate":
        adjusted_goal += 500
        adjustments.append("Workout adjustment")
        breakdown.append({"label": "Moderate workout", "amount": 500})
        reasons.append("activity level")
    elif req.workout_intensity == "intense":
        adjusted_goal += 750
        adjustments.append("Workout adjustment")
        breakdown.append({"label": "Intense workout", "amount": 750})
        reasons.append("activity level")

    # Posture-detected workout type → +300ml
    if req.detected_workout_type and str(req.detected_workout_type).strip():
        adjusted_goal += 300
        adjustments.append("Detected workout adjustment")
        breakdown.append({"label": "Detected workout", "amount": 300})
        if "activity level" not in reasons:
            reasons.append("activity level")

    adjusted_goal = max(1200, round(adjusted_goal, 0))

    # Build explanation message
    if reasons:
        explanation = (
            f"Today's hydration goal adjusted to {int(adjusted_goal)}ml "
            f"due to {' and '.join(reasons)}."
        )
    else:
        explanation = f"Today's hydration goal is {int(adjusted_goal)}ml (base goal)."

    return PredictHydrationResponse(
        base_goal=base_goal,
        adjusted_goal=int(adjusted_goal),
        adjustments=adjustments if adjustments else ["Base goal only"],
        adjustment_breakdown=breakdown,
        explanation=explanation,
    )


@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if not content:
            return {"detected_items": []}
        np_arr = np.frombuffer(content, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if image is None:
            return {"detected_items": [], "error": "Invalid image file"}
        results = yolo_model(image, conf=0.25)
        names = yolo_model.names
        detected_classes = []
        for r in results:
            for box in r.boxes:
                class_id = int(box.cls[0])
                detected_classes.append(names[class_id])
        detected_items = list(dict.fromkeys(detected_classes))
        return {"detected_items": detected_items}
    except Exception as e:
        return {"detected_items": [], "error": str(e)}
