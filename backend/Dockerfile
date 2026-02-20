# ── Build stage: install Python dependencies ──
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build-time system deps only
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer cache
COPY requirements-api.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements-api.txt

# ── Runtime stage: lean image ──
FROM python:3.12-slim AS runtime

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy only the application code needed
COPY src/ ./src/
COPY backend/ ./backend/
COPY backend_api.py .

# Create necessary directories
RUN mkdir -p models/sg_gan models/gnn_gan models/q_learning \
    results/plots results/metrics \
    data/generated_traffic data/training_data data/historical_routes

# Non-root user for security
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Graceful CPU fallback (no CUDA required)
ENV CUDA_VISIBLE_DEVICES=-1
ENV TF_CPP_MIN_LOG_LEVEL=3
ENV TF_ENABLE_ONEDNN_OPTS=0

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run application
CMD ["uvicorn", "backend_api:app", "--host", "0.0.0.0", "--port", "8000"]
