# Workout Assistant – FastAPI backend (production)
# Build: docker build -f backend/Dockerfile -t workout-backend .
# Run: docker run -p 8000:8000 -e CORS_ORIGINS=https://yourdomain.com -e MONGODB_URI=... workout-backend

FROM python:3.11-slim

WORKDIR /app

# System deps for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx libglib2.0-0 curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
# Optional: copy weights if built locally (or use volume at run)
# COPY backend/runs/detect/smart_fridge/weights/best.pt backend/runs/detect/smart_fridge/weights/

WORKDIR /app/backend

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

# Production: no reload, bind 0.0.0.0 for container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
