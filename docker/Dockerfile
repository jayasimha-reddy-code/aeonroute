# Dockerfile for EV Routing Project
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Expose port for Tensorboard (optional)
EXPOSE 6006

# Default command: run tests
CMD ["python", "-m", "pytest", "src", "-v"]
