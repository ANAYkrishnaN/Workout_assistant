# Workout Assistant – Technical Summary for AI Assistants

This document is a structured technical overview of the entire project for sharing with AI assistants or new developers. No code rewriting—explanations only.

---

## 1. High-Level Overview

### What the app does

**Workout Assistant** (also referred to as **FitTrack** in `PROJECT_SUMMARY.md`) is a full-stack fitness web app that combines:

- **User accounts and profiles** (auth, MongoDB, profile/dashboard).
- **Diet planning** driven by ML: user profile + optional fridge image → ingredient detection (YOLO) and macro prediction (RandomForest) → meal plan.
- **Posture/workout tracking** (real MediaPipe Pose in FastAPI; Next.js proxies to backend).
- **Hydration tracking**, **workout scheduling**, and an optional **Chatbot** (can use Gemini; diet/fridge flow does not use LLMs).

Diet and fridge flows use **only** the FastAPI ML backend and deterministic meal-plan building—no LLM for diet generation or food detection.

### Main features

| Feature | Description |
|--------|-------------|
| **Diet Planner** | Form: gender, goal, weight, height. Optional fridge image → YOLO detection → editable ingredients. "Generate Diet Plan" → `/api/diet/generate` → FastAPI `/predict-diet` + rule-based meal text. Shows BMI, macros, breakfast/lunch/dinner. |
| **YOLO detection** | `POST /detect` (FastAPI): accepts image file, runs custom YOLOv8 (Smart Fridge `best.pt`), returns JSON `{ detected_items: [...] }` with class names (15 classes: Beans, Egg, Tomato, etc.). |
| **ML diet model** | RandomForestRegressor (scikit-learn): inputs = gender, weight, height, goal; outputs = totalCalories, protein, carbs, fats. Served by `POST /predict-diet`. |
| **Posture module** | Real pose + rep counting: browser → Next.js `/api/posture/analyze` (proxy) → FastAPI `POST /posture/analyze` → MediaPipe Pose, joint angles, in-memory rep state; returns reps, calories, angle, fps, done_by_target. |
| **Chatbot** | Can use Gemini (via `GEMINI_API_KEY` / `NEXT_PUBLIC_GEMINI_API_KEY`); separate from diet/fridge. |
| **MongoDB** | **Required** for users, profiles, auth, optional diet plan persistence. Connection string in `NEXT_MONGODB_URI` (see Environment). |

---

## 2. Full Folder Structure (Tree)

```
Workout_assistant/
├── .dockerignore         # Excludes node_modules, .venv, .next, *.pt, .env* from Docker builds
├── .env.example          # Template; copy to .env.local (gitignored). App runs from .env.local.
├── .gitignore
├── docker-compose.yml    # Local prod-like run (backend + frontend); set env for CORS and API URL
├── Dockerfile.frontend   # Next.js standalone image; build args: NEXT_PUBLIC_API_URL, etc.
├── DEPLOYMENT.md         # Production deployment (Docker, CI/CD, env, security)
├── .github/workflows/ci.yml  # CI: frontend lint/test/build, backend verify, Docker build
├── eslint.config.mjs
├── instrumentation-client.js
├── instrumentation.js
├── jest.config.ts
├── jest.setup.js
├── jsconfig.json
├── next.config.mjs
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── PROJECT_SUMMARY.md
├── README.md
├── sentry.edge.config.js
├── sentry.server.config.js
├── TECHNICAL_SUMMARY.md          # this file
│
├── .swc/
│   └── plugins/
│       └── windows_x86_64_20.0.0/
│
├── backend/                      # FastAPI ML backend
│   ├── Dockerfile                # Production image; optional volume for best.pt
│   ├── main.py                   # FastAPI app: /health, /detect, /predict-diet, /predict-hydration; mounts posture router
│   ├── requirements.txt         # fastapi, uvicorn, ultralytics, opencv-python, mediapipe, etc.
│   ├── train_diet_model.py      # Trains RandomForest, saves diet_model.pkl
│   ├── train_yolo.py            # YOLOv8 training for Smart Fridge (best.pt)
│   ├── routes/
│   │   └── posture.py            # POST /posture/analyze, /posture/reset_session (MediaPipe Pose)
│   ├── services/
│   │   ├── pose_utils.py         # calculate_angle (numpy)
│   │   └── rep_counter.py        # session_states, get_angle_for_workout, update_rep_count
│   ├── models/
│   │   └── diet_model.pkl        # RandomForest diet model
│   ├── runs/detect/smart_fridge/weights/
│   │   └── best.pt               # Custom YOLOv8 Smart Fridge weights (15 classes)
│   └── databases/smart_fridge/   # Dataset data.yaml, train/, valid/
│
├── components/
│   ├── Profile.js
│   ├── Sidebar.js
│   └── modules/
│       ├── Chatbot.js
│       ├── DietPlanner.js        # Calls /detect and /api/diet/generate
│       ├── HomeComponent.js
│       ├── Hydration.js
│       ├── Posture.js
│       └── Workout.js
│
├── data/
│   └── HydrationTrainingData.js
│
├── lib/
│   └── mongodb.js
│
├── models/                       # Mongoose schemas (not ML)
│   ├── DietPlan.js
│   └── User.js
│
├── pages/
│   ├── _app.js
│   ├── _document.js
│   ├── _error.jsx
│   ├── dashboard.js
│   ├── index.js                  # Auth/landing
│   ├── profile.js
│   └── api/
│       ├── diet/
│       │   └── generate.js       # Proxies to FastAPI /predict-diet, builds meal plan
│       ├── fridge/
│       │   └── save-diet.js
│       ├── posture/
│       │   ├── analyze.js        # Proxy: forwards multipart to FastAPI /posture/analyze
│       │   ├── create_session.js # Returns session_id (timestamp)
│       │   └── reset_session.js  # Proxy: forwards to FastAPI /posture/reset_session
│       ├── users/
│       │   ├── login.js
│       │   ├── me.js
│       │   ├── route.js
│       │   └── signup.js
│       ├── fitness-goals.js
│       ├── hydration.js
│       ├── personal-details.js
│       ├── progress.js
│       ├── schedule.js
│       ├── sentry-example-api.js
│       ├── update-hydration.js
│       └── updateProfile.js
│
├── public/
│   ├── favicon.ico
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
│
├── styles/
│   └── globals.css
│
├── tests/
│   ├── DietPlanner.test.js
│   ├── HomeComponent.test.js
│   ├── Hydration.test.js
│   ├── index.test.js
│   ├── Posture.test.js
│   ├── profile.test.js
│   └── Workout.test.js
│
├── utils/
│   ├── constants.js
│   ├── functions.js
│   └── HydrationModel.js
│
└── .venv/                        # Python virtual environment
    └── (site-packages: fastapi, uvicorn, scikit-learn, joblib, ultralytics, torch, etc.)
```

**Notes:**

- **No `dataset/`** folder in the repo; YOLO uses the built-in COCO-style class names and a hardcoded food filter. Diet model is trained on **synthetic** data in `train_diet_model.py`.
- **No `runs/`** folder in the repo; YOLO training (if done elsewhere) typically writes to `runs/detect/train/` and produces `best.pt` / `last.pt`. This project uses the **pretrained** `yolov8n.pt` for inference only (see below).
- **Root `models/`** = Mongoose (User, DietPlan). **`backend/models/`** = ML artifact (`diet_model.pkl`).

---

## 3. Backend Explanation

### Entry and endpoints

- **File:** `backend/main.py`.
- **Run:** From `backend/`: `uvicorn main:app --reload`. Backend reads `OPENWEATHER_API_KEY` from process environment if set (optional).
- **CORS:** Controlled by env `CORS_ORIGINS` (comma-separated). Default `http://localhost:3000` for dev; in production set to your frontend origin(s), e.g. `https://yourdomain.com`.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/predict-diet` | POST | JSON body: `gender`, `weight`, `height`, `goal`. Returns `totalCalories`, `protein`, `carbs`, `fats` from RandomForest or defaults. |
| `/predict-hydration` | POST | JSON body: weight, temperature, humidity, city, workout_intensity, etc. Returns base_goal, adjusted_goal, adjustments; optional OpenWeather fetch when `OPENWEATHER_API_KEY` and city set. |
| `/detect` | POST | Multipart form with `file` (image). Runs YOLO (Smart Fridge `best.pt`), returns `{ detected_items: [...] }` (15-class names). |
| `/posture/analyze` | POST | Multipart: `file`, `session_id`, `workout_name`, `mode`, `target_reps`. MediaPipe Pose → angles → rep count; returns reps, calories, angle, fps, message, done_by_target. |
| `/posture/reset_session` | POST | JSON `{ session_id }`. Clears in-memory rep state for that session. |
| `/health` | GET | Returns `{ status: "ok", yolo_loaded: boolean }`. Use for load balancer and pipeline health checks. |

### `/detect` endpoint logic

1. **YOLO at startup:** `yolo_model` is loaded from `YOLO_MODEL_PATH` (default `backend/runs/detect/smart_fridge/weights/best.pt`, overridable via env). If the file is missing, the app still starts and `yolo_model` is `None`; `POST /detect` then returns **503** with detail `"Detection model not available."`.
2. **File handling:** Read upload bytes → `np.frombuffer` + `cv2.imdecode`; if invalid, return error in response.
3. **Inference:** `results = yolo_model(image, conf=0.25)` (only when `yolo_model` is set).
4. **Parse boxes:** For each result, iterate `r.boxes`; get `class_id`, map to `yolo_model.names[class_id]` → class name.
5. **Deduplicate:** `list(dict.fromkeys(detected_classes))`.
6. **Response:** `{ "detected_items": [...] }` (or 503 when model not loaded, or `{ "detected_items": [], "error": "..." }` on exception). No food-keyword filter; all 15 Smart Fridge classes returned.

### `/predict-diet` endpoint logic

1. **Request body:** Pydantic `PredictDietRequest`: `gender` (male/female), `weight`, `height`, `goal` (maintenance / weight_loss / muscle_gain).
2. **Fallback:** If `diet_model` is `None` (e.g. missing `diet_model.pkl`), return fixed defaults: 2000 cal, 120 protein, 200 carbs, 65 fats.
3. **Encode:** `_encode(gender, goal)` → gender 0/1, goal 0/1/2.
4. **Predict:** Single row `X = [[g, weight, height, goal_enc]]`; `pred = diet_model.predict(X)[0]` → 4 values (total_cal, protein, carbs, fats).
5. **Response:** Pydantic `PredictDietResponse` with rounded values.

### Where YOLO model is loaded

- **Location:** `backend/main.py`, at **startup**.
- **Path:** `YOLO_MODEL_PATH` from env, or default `os.path.join(BASE_DIR, "runs", "detect", "smart_fridge", "weights", "best.pt")`. If the file is missing, the app still starts and `yolo_model` is `None`; `GET /health` reports `yolo_loaded: false` and `POST /detect` returns 503.
- **Weights:** Custom Smart Fridge YOLOv8 model (15 classes). Trained via `backend/train_yolo.py`; outputs to `backend/runs/detect/smart_fridge/weights/best.pt`. In production (e.g. Docker), mount the weights or set `YOLO_MODEL_PATH` to the path inside the container.

### Where RandomForest model is loaded

- **Location:** `backend/main.py`, at **module load** (startup).
- **Code:** `MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "diet_model.pkl")`. If `os.path.isfile(MODEL_PATH)`, then `diet_model = joblib.load(MODEL_PATH)`; else `diet_model` stays `None` and `/predict-diet` uses defaults.

### How model paths are defined

- **Diet model:** `MODEL_PATH = os.path.join(BASE_DIR, "models", "diet_model.pkl")` → `backend/models/diet_model.pkl`.
- **YOLO:** `YOLO_MODEL_PATH = os.path.join(BASE_DIR, "runs", "detect", "smart_fridge", "weights", "best.pt")` → `backend/runs/detect/smart_fridge/weights/best.pt`.

---

## 4. Training Explanation

### train_diet_model.py purpose

- **File:** `backend/train_diet_model.py`.
- **Purpose:** Train the **diet macro prediction** model (RandomForestRegressor) on **synthetic** data and save it so `main.py` can load it.
- **Data:** No external dataset. Generates 2000 samples: random gender (0/1), weight (40–150 kg), height (140–210 cm), goal (0/1/2). Targets are formula-based (BMR-like for calories, then protein/carbs/fats with noise).
- **Model:** `RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)`. Single model predicts 4 outputs (multi-output regression).
- **Train/val:** `train_test_split(..., test_size=0.2, random_state=42)`. Prints R2.
- **Output:** Creates `backend/models/` if needed and saves `models/diet_model.pkl` via `joblib.dump(model, "models/diet_model.pkl")`. Must be run from the `backend/` directory so the path is correct.

### Where YOLO training outputs are stored

- **This repo does not include YOLO training.** Inference uses the **pretrained** `yolov8n.pt` only.
- If you were to train YOLO (e.g. custom food dataset) using Ultralytics elsewhere, training typically writes to a directory like `runs/detect/train/` and produces `weights/best.pt` and `weights/last.pt`.

### How best.pt is used

- **In this project:** `best.pt` is **not** used. The backend only uses `YOLO("yolov8n.pt")`.
- **In general Ultralytics workflow:** After training, `best.pt` is the best checkpoint; you would load it with e.g. `YOLO("runs/detect/train/weights/best.pt")` to use a custom-trained model. To switch this app to a custom model, you would change the string passed to `YOLO(...)` in `main.py` and ensure that model’s class names match or adjust the `food_keywords` filter.

---

## 5. Frontend Explanation

### Which component calls /detect

- **Component:** `components/modules/DietPlanner.js`.
- **When:** User selects a fridge/food image and clicks **"Analyze"**.
- **Handler:** `handleAnalyzeFridge()`.
- **Details:** Builds `FormData` with key `"file"` (the image file). Calls `fetch(\`${detectionApiUrl}/detect\`, { method: "POST", body: formData })`. `detectionApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'`. Response is `{ detected_items: string[] }`; `detected_items` is set as `ingredients` state (or empty on error).

### Which component calls /api/diet/generate

- **Component:** `components/modules/DietPlanner.js`.
- **When:** User clicks **"Generate Diet Plan"** (after filling gender, goal, weight, height; ingredients are optional).
- **Handler:** `handleSubmit()`. Sends `POST /api/diet/generate` with JSON body: `gender`, `weight`, `height`, `goal`, `ingredients` (array from YOLO + manual edits).
- **Next.js route:** `pages/api/diet/generate.js` receives the request, normalizes goal/gender, calls FastAPI `POST /predict-diet` with profile only (no ingredients in that call), then builds meal plan text from `ingredients` and the returned macros (see below).

### How ingredients flow from YOLO → Diet API

1. **YOLO:** User uploads image → "Analyze" → frontend `POST` to FastAPI `/detect` → backend returns list of strings (e.g. `["apple","banana"]`) → stored in `ingredients` state in `DietPlanner.js`. User can add/remove ingredients manually.
2. **Generate:** User clicks "Generate Diet Plan" → frontend `POST` to **Next.js** `/api/diet/generate` with body `{ gender, weight, height, goal, ingredients }`.
3. **Next.js handler (`pages/api/diet/generate.js`):**  
   - Calls FastAPI `POST /predict-diet` with only `{ gender, weight, height, goal }` (no ingredients).  
   - Receives `{ totalCalories, protein, carbs, fats }`.  
   - Calls `buildMealPlan(ingredients, macros)` to build breakfast/lunch/dinner **text** using the ingredients list and macro targets (deterministic, no LLM).  
   - Returns that meal plan + macros to the frontend.
4. **DietPlanner** displays the result (BMI, macros, meal plan sections).

So: **ingredients** come from YOLO (and manual edits) and are used only in the **Next.js** meal-plan builder; the **FastAPI** `/predict-diet` endpoint does **not** receive ingredients—only gender, weight, height, goal.

---

## 6. Environment Configuration

### Running the app from env

- **Next.js** loads `.env.local` (and `.env`) automatically from the **project root**. Copy `.env.example` to `.env.local` and set at least `NEXT_MONGODB_URI` so the app can start (MongoDB is required for auth and user data).
- **FastAPI** reads `os.environ`; no `.env` file is loaded by the backend. Set `OPENWEATHER_API_KEY` in the shell before starting uvicorn if you want server-side weather by city for hydration.

### Python

- **Version:** Not pinned. Use Python 3.10+ (e.g. 3.11). Venv is typically at project root (`.venv`).

### Key backend dependencies (from backend/requirements.txt)

- `fastapi`, `uvicorn[standard]`, `python-multipart`
- `scikit-learn`, `joblib`, `numpy`, `pydantic`
- `ultralytics`, `opencv-python`, `pillow`
- `mediapipe>=0.10.0` (posture)

### GPU

- PyTorch/Ultralytics use CUDA if available (e.g. YOLO training or `/detect`). MediaPipe posture runs on CPU. No explicit `device=` in main app code.

### Environment variables (.env.example → .env.local)

| Variable | Where used | Required | Notes |
|----------|------------|----------|--------|
| **NEXT_MONGODB_URI** | Next.js (lib/mongodb.js) | **Yes** | MongoDB connection string. App throws at runtime if missing. Example: `mongodb://localhost:27017`. |
| **NEXT_PUBLIC_API_URL** | Next.js API routes, DietPlanner, Hydration, Posture proxy | No (default: http://localhost:8000) | FastAPI backend URL. Next.js proxies (diet, posture, etc.) call this URL. |
| **OPENWEATHER_API_KEY** | Backend main.py (/predict-hydration) | No | Server-side weather fetch by city; empty string if unset. |
| **NEXT_PUBLIC_OPENWEATHER_API_KEY** | Hydration.js, weatherApi.js | No | Client-side weather; optional. |
| **GEMINI_API_KEY** / **NEXT_PUBLIC_GEMINI_API_KEY** | Chatbot.js | No | Chatbot only; not used by diet, detect, or posture. |
| **SENTRY_DSN** | sentry.*.config.js | No | Error reporting. |
| **CORS_ORIGINS** | Backend main.py | No (default: http://localhost:3000) | Comma-separated allowed origins. Set in production to frontend origin(s). |
| **YOLO_MODEL_PATH** | Backend main.py | No | Path to Smart Fridge `best.pt`. Override for Docker/mounts; if unset, default path under `backend/` is used. |

---

## 7. Deployment (Docker, CI/CD, production)

- **Docker:** `backend/Dockerfile` (FastAPI), `Dockerfile.frontend` (Next.js standalone). See `DEPLOYMENT.md` and `docker-compose.yml` for build/run and local prod-like runs.
- **Next.js:** `next.config.mjs` sets `output: 'standalone'` for the frontend container.
- **CI:** `.github/workflows/ci.yml` runs on push/PR to `main`/`develop`: frontend lint/test/build, backend install/verify, Docker build of both images. For AWS, add a deploy job (ECR push + ECS/App Runner update) using GitHub Secrets for credentials.
- **Production env:** Set `CORS_ORIGINS` (backend), `NEXT_PUBLIC_API_URL` (frontend build), `NEXT_MONGODB_URI`; use AWS Secrets Manager or Parameter Store for secrets—do not commit real values.
- **Health:** Backend `GET /health` returns `{ status: "ok", yolo_loaded: boolean }` for load balancers and pipelines.
- **Security:** HTTPS in production; optional rate limiting and security headers; consider password hashing (e.g. bcrypt) for login (see PROJECT_SUMMARY).

---

## 8. Known Issues / TODO Items

- **MongoDB required:** If `NEXT_MONGODB_URI` is not set, any route that uses `connectDB()` (e.g. auth, users) will throw. Ensure `.env.local` has a valid MongoDB URI.
- **Diet model:** Trained on synthetic data only. For production, consider training on real diet/macro data.
- **CORS:** Default `http://localhost:3000`; for production set `CORS_ORIGINS` to your frontend origin(s).
- **Posture:** Real MediaPipe Pose + rep logic; session state is in-memory (lost on backend restart). For production, consider persisting session or using a queue.
- **YOLO:** Custom Smart Fridge `best.pt`; if missing, backend still starts but `POST /detect` returns 503. Provide weights via volume or `YOLO_MODEL_PATH` in production.

---

**End of technical summary.**
