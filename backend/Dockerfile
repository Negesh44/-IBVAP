# ==============================================================================
# IBVAP Backend — Production-Oriented FastAPI & AI Ingestion Container
# Supports NVIDIA Container Toolkit (CUDA) & Graceful CPU Fallback
# ==============================================================================

FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=8000 \
    HOST=0.0.0.0

# Install Linux system dependencies for OpenCV, FFmpeg, and networking
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for Docker layer caching
COPY requirements.txt .

# Upgrade pip and install dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Create models and evidence directories
RUN mkdir -p /app/models /app/evidence

# Copy backend application source code
COPY . /app/

# Expose FastAPI port
EXPOSE 8000

# Docker Health Check probing /api/health
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start FastAPI application via Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
