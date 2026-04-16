# Model Layout (Diet + Fridge)

This document explains where model files are, how they are used at runtime, and how to retrain them.

## 1) Diet model (classic ML, no LLM)

### Purpose
- Predicts structured diet guidance from profile inputs and `GYM.csv`.
- Used by `pages/api/diet/predict.js`.

### Files
- `ml_diet/train_diet_from_gym.py` - training script
- `ml_diet/diet_predict_infer.py` - Python inference script
- `ml_diet/_bmi.py` - shared feature helpers (BMI/category mappings)
- `ml_diet/artifacts/diet_rf_pipeline.joblib` - trained RandomForest pipeline (runtime model)
- `ml_diet/artifacts/diet_rf_meta.json` - metadata about the trained model
- `GYM.csv` - training source and CSV fallback data
- `requirements-diet-ai.txt` - Python packages for diet ML (`pandas`, `scikit-learn`, `joblib`)

### Runtime flow
1. Frontend calls `POST /api/diet/predict`.
2. Route computes BMI + macro targets in Node.
3. Route tries Python inference via `lib/runDietMlInfer.js` (spawns `python -m ml_diet.diet_predict_infer`).
4. If Python/model is unavailable, route falls back to CSV lookup (`lib/gymCsvIndex.js`) so diet still works.

### Retrain
```bash
pip install -r requirements-diet-ai.txt
npm run train-diet-ai
```

## 2) Fridge model (YOLO)

### Purpose
- Detects food items from uploaded fridge images.
- Used by `pages/api/fridge/detect.js`.

### Files
- `fridge_detect_infer.py` - Python inference script called by the Next API route
- `backend/runs/detect/smart_fridge_train/weights/best.pt` - deployed YOLO weights used at runtime
- `train_fridge_model.py` - optional retraining script
- `train_diet_fridge_yolo.py` - optional YOLO training workflow script
- `FridgeVision.yolov8/data.yaml` and `FridgeVision.yolov8/data.local.yaml` - dataset config files

### Runtime flow
1. Frontend uploads image to `POST /api/fridge/detect`.
2. Route spawns `python fridge_detect_infer.py --model ...best.pt --image ...`.
3. Script returns `JSON_RESULT:...` with detected items.
4. Route merges items into user fridge data in MongoDB.

### Notes
- Only `best.pt` is intentionally kept in git for runtime.
- Extra training outputs (`results.png`, `last.pt`, etc.) are not needed for app execution.
- `yolov8n.pt` is gitignored; Ultralytics can download it during training.

## 3) Deploy/teammate expectations

- Local full features need:
  - Node + npm
  - MongoDB connection in `.env.local`
  - Python on PATH
  - Python deps for diet/fridge ML
- If Python is unavailable:
  - Diet still works via heuristic + CSV fallback.
  - Fridge detection cannot run.

## 4) Quick verification

- Diet model present:
  - `ml_diet/artifacts/diet_rf_pipeline.joblib`
- Fridge model present:
  - `backend/runs/detect/smart_fridge_train/weights/best.pt`
- Diet train command:
  - `npm run train-diet-ai`

## 5) What changed compared to the older code

This section is for reviewers who know the **previous** version of the app (diet only talked to the remote FastAPI URL, and fridge inference was a plain Python script).

### Diet Planner (`components/modules/DietPlanner.js`)

| Before | After |
|--------|--------|
| Loaded dropdown options only from `{NEXT_PUBLIC_API_URL}/diet/info`. If that URL failed, selects were empty. | Tries **`GET /api/diet/info`** first, then **`{NEXT_PUBLIC_API_URL}/diet/info`**, then hard-coded defaults so the form always has options. |
| Submitted only to **`{NEXT_PUBLIC_API_URL}/diet/predict`**. | Tries **`POST /api/diet/predict`** first (includes **`fridgeItems`** for recipe suggestions), then falls back to **`{NEXT_PUBLIC_API_URL}/diet/predict`** if the local call fails. |
| No fridge linkage in the planner. | Loads fridge items from **`GET /api/fridge/items`** when the user is logged in, and syncs **`fridgeItemsForDiet`** in `localStorage`. |
| Results were only the remote JSON shape. | Response can include **`gym`** (exercise + meal focus), **`gym_source`** (`sklearn_rf_gym` vs `csv_lookup`), and **`recipes`** (template recipes from fridge items + BMI/goal). |

### New Next.js API routes (not in the old client-only diet flow)

- `pages/api/diet/info.js` — stable gender/goal list for the UI.
- `pages/api/diet/predict.js` — server-side BMI + macro heuristics, optional Python RF via `lib/runDietMlInfer.js`, `GYM.csv` fallback via `lib/gymCsvIndex.js`, fridge recipes via `lib/recipesFromFridge.js`.

### New supporting libraries

- `lib/dietHeuristics.js` — BMI category and calorie/protein targets (same idea as the Python demo API, in Node).
- `lib/gymCsvIndex.js` — builds an in-memory index from **`GYM.csv`** for lookup fallback.
- `lib/parseCsvLine.js` — quoted-field CSV parsing for `GYM.csv`.
- `lib/recipesFromFridge.js` — rule-based recipe cards from detected fridge items.
- `lib/runDietMlInfer.js` — child-process wrapper; prints `JSON_RESULT:...` like `fridge_detect_infer.py`.

### Diet ML package (new)

- `ml_diet/` — **`train_diet_from_gym.py`** (train), **`diet_predict_infer.py`** (infer), **`artifacts/*.joblib`**, **`GYM.csv`** as training + fallback source.
- `requirements-diet-ai.txt` — sklearn stack.
- `package.json` — script **`train-diet-ai`** → `python -m ml_diet.train_diet_from_gym`.

### Fridge inference (`fridge_detect_infer.py`)

| Before | After |
|--------|--------|
| `from ultralytics import YOLO` immediately. On some Windows setups, Ultralytics **`GitRepo()`** walks parent dirs and **`Path.exists`** throws (e.g. WinError 1337), crashing before inference. | Applies the same **`pathlib.Path.exists`** patch used in `train_fridge_model.py` / `train_diet_fridge_yolo.py` **before** importing Ultralytics, so import is stable on those machines. |

`pages/api/fridge/detect.js` was already the integration point; it still spawns **`python fridge_detect_infer.py`** with **`backend/runs/detect/smart_fridge_train/weights/best.pt`**.

### Repository / hygiene (what teammates see in git)

- **`GYM.csv`** is included for training + CSV fallback (large file by design).
- Runtime fridge weights are at `backend/runs/detect/smart_fridge_train/weights/best.pt`.
- **`yolov8n.pt`** is **gitignored** (Ultralytics can download it when training).
- **`FridgeVision.yolov8/train|valid|test`** are **gitignored**; configs under `FridgeVision.yolov8/*.yaml` are kept.
- **`__pycache__`** and **`*.pyc`** are gitignored.

### Behaviour summary for your friend

- **Old behaviour:** diet UI depended on the deployed Python API for both options and prediction.
- **New behaviour:** diet runs **primarily on Next.js** with optional **local sklearn** and **`GYM.csv`** fallback; the **old remote API** is still used automatically if the local predict call fails and **`NEXT_PUBLIC_API_URL`** is set.
- **Fridge:** same architecture (Next API → Python script → weights), with a **Windows-safe** Ultralytics import.
