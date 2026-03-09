# FitTrack – Capstone Implementation Summary

## 1. Project Overview

FitTrack is a full-stack AI-powered fitness web application built using:

- **Next.js (Frontend)** – React-based UI with API routes for server-side logic and proxying to the ML backend.
- **FastAPI (Backend)** – Python backend serving machine learning models for food detection and diet prediction.
- **Machine Learning models** – Food detection (YOLOv8) and diet macro prediction (RandomForestRegressor).
- **MongoDB** – Used for user data, profiles, and optional persistence of diet plans (e.g. DietPlan model).

The system integrates computer vision and supervised machine learning for diet-related features. Diet generation and fridge-based ingredient detection do **not** use any LLM APIs (e.g. Gemini or OpenAI); all diet and detection logic is driven by trained ML models and deterministic rules.

---

## 2. System Architecture

The architecture is structured as follows:

```
Frontend (Next.js, localhost:3000)
    → Next.js API Routes (e.g. /api/diet/generate)
        → FastAPI ML Backend (localhost:8000)
            → ML Models:
                - YOLOv8 for food detection (/detect)
                - RandomForestRegressor for diet prediction (/predict-diet)
```

- **Frontend** runs on **localhost:3000** (Next.js dev server).
- **Backend** runs on **localhost:8000** (FastAPI with uvicorn).
- **CORS** is configured on FastAPI to allow requests from `http://localhost:3000` (origins, methods, and headers as required).
- **Diet and fridge flows** use only the FastAPI ML backend and Next.js API routes; no Gemini or OpenAI is used in these flows.

---

## 3. Features Implemented

### Diet Planner (Main Entry Point)

- **Gender selection** – Dropdown (e.g. Male / Female) for user profile.
- **Fitness goal selection** – Options such as Weight Loss, Build Muscle, Get Fit, Maintenance, Muscle Gain.
- **Weight and height input** – Numeric fields (kg, cm) for profile and ML input.
- **Optional fridge image upload** – File input for a single image; preview shown before analysis.
- **Ingredient detection via ML** – “Analyze” sends the image to FastAPI `/detect` (YOLO); response is a list of ingredient names.
- **Editable ingredient list** – Detected items shown as removable chips; user can add custom items via text input.
- **Diet generation via trained ML model** – “Generate Diet Plan” sends profile + ingredients to Next.js `/api/diet/generate`, which calls FastAPI `/predict-diet` and builds a structured meal plan (breakfast, lunch, dinner, macros).
- **BMI calculation** – Computed from weight and height; displayed with the result.
- **Macro breakdown** – Total calories, protein, carbs, and fats shown in the diet result.

### Smart Fridge Integration (within Diet Planner)

- **Image upload** – User selects a fridge/food image (e.g. JPEG, PNG).
- **Preview** – Thumbnail of the selected image before analysis.
- **Analyze button** – Triggers detection; shows loading state during the request.
- **Calls FastAPI `/detect` endpoint** – POST with multipart form data (image file).
- **Returns JSON array of ingredients** – e.g. `["milk", "egg", "tomato"]`.
- **Ingredients auto-filled into diet planner** – Response populates the editable ingredient list used for “Generate Diet Plan”.

---

## 4. Machine Learning Implementation

### 4.1 Food Detection Model

- **Architecture:** Pretrained YOLOv8n (`yolov8n.pt`) via Ultralytics; loaded lazily on first `/detect` call. No custom YOLO training in this project.
- **Role:** Runs object detection on the uploaded image; results are filtered to a hardcoded food-related subset of class names (e.g. apple, banana, orange, broccoli, carrot, sandwich, pizza, hot dog, bottle, cup).
- **Output:** List of detected ingredient names (strings) that match the filter.
- **Endpoint:** `POST /detect`
  - **Input:** Multipart form with image file (field name `file`).
  - **Output:** JSON array of strings, e.g. `["apple", "banana"]`.

### 4.2 Diet Prediction Model

- **Model:** RandomForestRegressor (scikit-learn).
- **Training:** Synthetic dataset generated in `train_diet_model.py` (gender, weight, height, goal; targets: totalCalories, protein, carbs, fats).
- **Inputs (encoded):**
  - Gender (e.g. 0 = female, 1 = male)
  - Weight (kg)
  - Height (cm)
  - Goal (e.g. 0 = maintenance, 1 = weight_loss, 2 = muscle_gain)
- **Outputs:**
  - Total calories
  - Protein (g)
  - Carbs (g)
  - Fats (g)
- **Endpoint:** `POST /predict-diet`
  - **Input:** JSON body with `gender`, `weight`, `height`, `goal`.
  - **Output:** JSON with `totalCalories`, `protein`, `carbs`, `fats`.
- **Persistence:** Model saved with joblib to `backend/models/diet_model.pkl`. If the file is missing, the API returns safe default values.

---

## 5. Removed Components

The following were removed to rely solely on ML (no LLMs) for diet and fridge flows:

- **Gemini usage for diet generation** – All diet plan generation now uses the FastAPI ML backend and Next.js `/api/diet/generate`.
- **LLM-based fridge analysis** – Fridge image analysis uses only the YOLO-based `/detect` endpoint; no Gemini Vision or other LLM.
- **Deleted:** `pages/api/fridge/generate-diet.js` (previously used Gemini for diet text).
- **Removed:** Reliance on `NEXT_PUBLIC_GEMINI_API_KEY` (or equivalent) for the diet/fridge flow. (Gemini may still be used elsewhere, e.g. Chatbot, if configured separately.)

---

## 6. Backend Setup

From the project root:

```bash
cd backend
pip install -r requirements.txt
python train_diet_model.py
uvicorn main:app --reload
```

- `train_diet_model.py` generates the synthetic dataset, trains the RandomForestRegressor, and saves the model to `models/diet_model.pkl`.
- `main.py` loads the diet model at startup from `backend/models/diet_model.pkl` and exposes `/predict-diet` and `/detect`. YOLO is loaded on first `/detect` request using pretrained `yolov8n.pt`.

---

## 7. Frontend Setup

From the project root:

```bash
npm install
npm run dev
```

The Next.js app runs at **http://localhost:3000**. Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local` so the frontend and API routes point to the FastAPI backend.

---

## 8. Final System Flow

1. **User fills profile** – Gender, goal, weight, height in the Diet Planner form.
2. **Optional fridge image upload** – User may attach an image and click “Analyze.”
3. **YOLO detects ingredients** – Image is sent to FastAPI `POST /detect`; backend returns a JSON array of ingredient names.
4. **Ingredients list** – Detected items (and any manually added items) are shown in an editable list.
5. **ML predicts macros** – On “Generate Diet Plan,” Next.js calls FastAPI `POST /predict-diet` with profile only (gender, weight, height, goal); backend returns totalCalories, protein, carbs, fats.
6. **Next.js generates structured meal plan** – `/api/diet/generate` uses those macro targets plus the (optional) ingredients list to build breakfast, lunch, and dinner descriptions (deterministic, no LLM).
7. **Results displayed** – BMI, macros, and meal plan (breakfast, lunch, dinner) are shown in the Diet Planner UI.

---

## 9. Technical Notes

- All API routes (Next.js and FastAPI) return **strict JSON**; no markdown or free-form text in API responses for diet/detection.
- **No external LLM** is used for diet generation or fridge analysis; only ML models and rule-based meal plan assembly.
- **Modular architecture** – Diet Planner, Posture Tracker, Chatbot, and other modules are kept separate; changes to diet/fridge do not alter Posture or Chatbot behavior.
- **Posture and Chatbot modules** remain untouched by the diet/fridge and ML backend integration described in this summary.
- **Detailed technical reference:** See **TECHNICAL_SUMMARY.md** for a full technical summary (folder structure, endpoint logic, model paths, frontend flow, environment, known issues) suitable for AI assistants or new developers.
- **Limitations:** Diet model is trained on synthetic data only; YOLO uses a small fixed food filter (COCO-derived classes). `/detect` writes a temp file in the process cwd—run uvicorn from `backend/` to avoid path issues.
