# Deployment (AWS / production)

This document covers production deployment with Docker, CI/CD, and security.

## Build and run with Docker

### Backend

```bash
docker build -f backend/Dockerfile -t workout-backend .
docker run -p 8000:8000 \
  -e CORS_ORIGINS=https://yourdomain.com \
  -e MONGODB_URI="mongodb+srv://..." \
  -e YOLO_MODEL_PATH=/app/backend/runs/detect/smart_fridge/weights/best.pt \
  -v /path/to/weights:/app/backend/runs/detect/smart_fridge/weights:ro \
  workout-backend
```

- **YOLO:** If `best.pt` is not in the image, mount a volume with the weights or set `YOLO_MODEL_PATH` to the mounted path. Without the model, the app still starts; `POST /detect` returns 503.
- **Health:** `GET /health` returns `{"status":"ok","yolo_loaded":true|false}` for load balancers.

### Frontend

Build-time args (required for correct API URL in the client):

```bash
docker build -f Dockerfile.frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  -t workout-frontend .
docker run -p 3000:3000 -e NEXT_MONGODB_URI="mongodb+srv://..." workout-frontend
```

### Compose (local prod-like)

```bash
export CORS_ORIGINS=http://localhost:3000
export NEXT_PUBLIC_API_URL=http://localhost:8000
export NEXT_MONGODB_URI="mongodb://..."
docker compose up --build
```

## CI/CD (GitHub Actions)

- **Workflow:** `.github/workflows/ci.yml`
- **Jobs:** Frontend (lint, test, build), backend (install, verify), Docker (build both images).
- **AWS:** To deploy to ECS/App Runner/EC2, add a deploy job that: (1) logs in to ECR, (2) pushes `workout-backend:ci` and `workout-frontend:ci` (or versioned tags), (3) updates your service (e.g. ECS task definition or App Runner). Store `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and ECR registry in GitHub Secrets.

## Production environment variables

| Variable | Service | Required in prod | Notes |
|----------|---------|------------------|--------|
| `CORS_ORIGINS` | Backend | Yes | Comma-separated allowed origins, e.g. `https://app.yourdomain.com` |
| `NEXT_PUBLIC_API_URL` | Frontend (build) | Yes | Backend URL the browser will call |
| `NEXT_MONGODB_URI` | Frontend | Yes | MongoDB connection string |
| `MONGODB_URI` | Backend | If backend uses DB | Same as above if backend needs DB |
| `YOLO_MODEL_PATH` | Backend | No | Override path to `best.pt` (e.g. in container) |
| `OPENWEATHER_API_KEY` | Backend | No | Hydration weather by city |
| `NEXT_PUBLIC_OPENWEATHER_API_KEY` | Frontend | No | Client-side weather |
| `NEXT_PUBLIC_GEMINI_API_KEY` | Frontend | No | Chatbot only |

## Security

- **Secrets:** Do not commit `.env`, `.env.local`, or any file with real keys. Use AWS Secrets Manager or Parameter Store (or GitHub Secrets for CI) and inject at runtime.
- **CORS:** Set `CORS_ORIGINS` to your frontend origin(s) only in production.
- **HTTPS:** Serve frontend and backend over HTTPS (e.g. ALB, CloudFront, or your host).
- **Auth:** Login currently uses plain-text password comparison; consider hashing (e.g. bcrypt) and document in PROJECT_SUMMARY.
- **Optional:** Add rate limiting and security headers (e.g. CSP, X-Frame-Options) in frontend/backend or at the load balancer.

## Next.js config

- `next.config.mjs` sets `output: 'standalone'` for the frontend Docker image (smaller, self-contained server).
