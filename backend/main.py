"""
FastAPI app: YOLO /detect (Smart Fridge best.pt) + ML /predict-diet + /predict-hydration.
Run from backend dir: uvicorn main:app --reload
"""
import io
import os
import numpy as np
import cv2
import joblib
import sklearn

print("SKLEARN VERSION:", sklearn.__version__)

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal
from ultralytics import YOLO
from models.recipe_model import predict_dish, predict_top_dishes, get_recipe_by_name, load_model as load_recipe_model
from models.hydration_model import predict_hydration as predict_hydration_ml, load_models as load_hydration_models

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
YOLO_MODEL_PATH = os.environ.get("YOLO_MODEL_PATH") or os.path.join(BASE_DIR, "runs", "detect", "smart_fridge", "weights", "best.pt")
yolo_model = None
if os.path.isfile(YOLO_MODEL_PATH):
    yolo_model = YOLO(YOLO_MODEL_PATH)
    print("YOLO model loaded successfully")
else:
    print(f"Warning: YOLO model not found at {YOLO_MODEL_PATH}. /detect will return 503 until model is available.")

MODEL_PATH = os.path.join(BASE_DIR, "models", "diet_model.pkl")
print("Loading model from:", os.path.abspath(MODEL_PATH))


class PredictHydrationRequest(BaseModel):
    weight: float
    age: float = 30
    gender: int = 1  # 0=female, 1=male
    activity_level: int = 2  # 1=low, 2=moderate, 3=high
    weather: int = 1  # 0=cold, 1=normal, 2=hot


class PredictHydrationResponse(BaseModel):
    water_intake: float
    hydration_level: Literal["Low", "Normal", "High"]
    water_intake_ml: int


class PredictRecipeRequest(BaseModel):
    ingredients: list[str]


class PredictRecipeResponse(BaseModel):
    meal: dict
    top_predictions: list[dict] = []

app = FastAPI(title="Workout Assistant API", version="1.0.0")

# CORS: use env in production (e.g. CORS_ORIGINS=https://yourdomain.com), default localhost for dev
_CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000").strip()
_origins = [o.strip() for o in _CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
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

if not load_recipe_model():
    print("Warning: recipe model/vectorizer not found. Recipe prediction will fallback.")
if not load_hydration_models():
    print("Warning: hydration regressor/classifier not found. Hydration prediction will fallback.")


def _normalize_label(label: str) -> str:
    return str(label).strip().lower().replace("_", " ")


def _detect_labels(
    model: YOLO,
    image: np.ndarray,
    conf: float,
    imgsz: int = 640,
    allowed_names: set[str] | None = None,
) -> dict[str, float]:
    """
    Return normalized labels mapped to best confidence score.
    """
    detected: dict[str, float] = {}
    names = model.names
    # Slightly larger inference size and lower conf improve recall for small/mid objects.
    results = model(image, conf=conf, imgsz=imgsz, verbose=False)
    for r in results:
        for box in r.boxes:
            class_id = int(box.cls[0])
            raw_name = names[class_id]
            label = _normalize_label(raw_name)
            if allowed_names is not None and label not in allowed_names:
                continue
            score = float(box.conf[0]) if box.conf is not None else conf
            prev = detected.get(label, 0.0)
            if score > prev:
                detected[label] = score
    return detected


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


@app.post("/predict-recipe", response_model=PredictRecipeResponse)
def predict_recipe(req: PredictRecipeRequest):
    ingredients = [str(i).strip().lower() for i in req.ingredients if str(i).strip()]
    if not ingredients:
        raise HTTPException(status_code=400, detail="ingredients are required")

    dish_name = predict_dish(ingredients)
    top = predict_top_dishes(ingredients, top_k=3)
    recipe = get_recipe_by_name(dish_name) if dish_name else None
    if not recipe and top:
        recipe = get_recipe_by_name(top[0].get("dish_name", ""))

    if not recipe:
        # Soft fallback for deployability: still return deterministic structure.
        recipe = {
            "name": "Mixed Ingredient Bowl",
            "ingredients": ingredients[:6],
            "steps": [
                "Wash and chop available ingredients.",
                "Heat a pan with little oil.",
                "Cook ingredients until tender.",
                "Season with available powders and serve."
            ],
            "powders": ["salt", "pepper"],
        }

    return PredictRecipeResponse(meal=recipe, top_predictions=top)


@app.post("/predict-hydration", response_model=PredictHydrationResponse)
def predict_hydration(req: PredictHydrationRequest):
    payload = {
        "weight": req.weight,
        "age": req.age,
        "gender": req.gender,
        "activity_level": req.activity_level,
        "weather": req.weather,
    }
    pred = predict_hydration_ml(payload)
    water_intake = float(pred.get("water_intake", 2.5))
    hydration_level = str(pred.get("hydration_level", "Normal"))
    if hydration_level not in {"Low", "Normal", "High"}:
        hydration_level = "Normal"
    return PredictHydrationResponse(
        water_intake=round(water_intake, 2),
        hydration_level=hydration_level,
        water_intake_ml=int(round(water_intake * 1000)),
    )


@app.get("/health")
def health():
    """Health check for load balancer and pipelines."""
    return {"status": "ok", "yolo_loaded": yolo_model is not None}


@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    if yolo_model is None:
        raise HTTPException(status_code=503, detail="Detection model not available.")
    try:
        content = await file.read()
        if not content:
            return {"detected_items": []}
        np_arr = np.frombuffer(content, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if image is None:
            return {"detected_items": [], "error": "Invalid image file"}

        # 1) Primary custom model (lower threshold for better recall on fridge clutter).
        combined = _detect_labels(
            model=yolo_model,
            image=image,
            conf=0.18,
            imgsz=640,
            allowed_names=None,
        )

        # Sort by confidence for stable, useful ordering.
        detected_items = [
            label for label, _ in sorted(combined.items(), key=lambda x: x[1], reverse=True)
        ]
        return {"detected_items": detected_items}
    except Exception as e:
        return {"detected_items": [], "error": str(e)}
