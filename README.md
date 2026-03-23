# Workout Assistant (FitTrack)

Full-stack fitness web app: user accounts, diet planning (ML + optional YOLO fridge detection), posture tracking (MediaPipe), hydration, workout scheduling, and an optional chatbot.

- **Frontend:** Next.js (React)
- **Backend:** FastAPI (Python) — diet prediction, hydration, YOLO detection, posture
- **Database:** MongoDB (required for auth and user data)

---

## Run on localhost

### 1. Clone and env

```bash
git clone https://github.com/ANAYkrishnaN/Workout_assistant.git
cd Workout_assistant
```

Copy the env template and set at least the MongoDB URI (required for login and user data):

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

- **`NEXT_MONGODB_URI`** — **Required.** MongoDB connection string (e.g. `mongodb://localhost:27017` or a cloud URI). The app will not start without it.
- **`NEXT_PUBLIC_API_URL`** — Optional. Backend URL; default `http://localhost:8000` is correct when the backend runs on the same machine.

Other variables (OpenWeather, Gemini, Sentry) are optional. See `.env.example` for comments.

**MongoDB must be running** (locally or the URI must point to a reachable instance).

### 2. Backend (FastAPI)

From the project root:

```bash
cd backend
pip install -r requirements.txt
```

Optional — train the diet model so `/predict-diet` uses ML instead of fixed defaults (creates `backend/models/diet_model.pkl`):

```bash
python train_diet_model.py
```

Optional — YOLO fridge detection: if you have Smart Fridge weights, place `best.pt` at:

`backend/runs/detect/smart_fridge/weights/best.pt`

If that file is missing, the backend still runs; the **Analyze** (fridge) feature will return "Detection model not available" until the model is there.

Optional — retrain custom YOLO model for better accuracy/precision:

```bash
cd backend
python check_class_distribution.py
python train_yolo.py --model yolov8s.pt --epochs 120 --imgsz 640 --batch 4
```

Optional — expand classes from Open Images and rebalance before retraining:

```bash
cd backend
python tools/OIDv6/oidv6/samples/run.py downloader en --dataset databases/openimages_addon --type_data all --classes Banana Orange Watermelon --limit 220 --yes
python expand_dataset_with_openimages.py --classes Banana Orange Watermelon --reset-openimages-import --train-per-class-limit 180 --valid-per-class-limit 60 --test-per-class-limit 90 --train-max-objects-per-class 420
python rebalance_yolo_train.py --target-count 260 --max-new-per-class 180
python check_class_distribution.py
python train_yolo.py --model yolov8s.pt --epochs 100 --imgsz 640 --batch 4
```

For low VRAM GPUs, try:

```bash
python train_yolo.py --model yolov8n.pt --epochs 120 --imgsz 640 --batch 2
```

This writes updated weights to:
`backend/runs/detect/smart_fridge/weights/best.pt`

Start the backend (must be run from the `backend/` directory):

```bash
uvicorn main:app --reload
```

Backend runs at **http://localhost:8000**. Health check: **http://localhost:8000/health**.

### 3. Frontend (Next.js)

From the project root (in a new terminal):

```bash
npm install
npm run dev
```

Frontend runs at **http://localhost:3000**. Open it in the browser; the app will call the backend at `NEXT_PUBLIC_API_URL` (default localhost:8000).

---

## Quick check

1. **Backend:** Open http://localhost:8000/health — you should see `{"status":"ok","yolo_loaded":true}` or `"yolo_loaded":false` if `best.pt` is not present.
2. **Frontend:** Open http://localhost:3000 — you should see the app. Sign up / log in (requires MongoDB).

---

## Optional

- **Diet model:** Run `python train_diet_model.py` from `backend/` to generate `diet_model.pkl`; otherwise diet plan uses default macros.
- **YOLO:** Add `best.pt` under `backend/runs/detect/smart_fridge/weights/` for fridge image detection.
- **Deployment:** See `DEPLOYMENT.md` for Docker, CI/CD, and production env.
- **Technical details:** See `TECHNICAL_SUMMARY.md` and `PROJECT_SUMMARY.md`.
