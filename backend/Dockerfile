# Use Python 3.10 slim image as base
FROM python:3.10-slim

# Set working directory in container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml
COPY pyproject.toml .

# Install Python dependencies
RUN pip install --no-cache-dir -e .

# Copy the rest of the application code
COPY . .

# Expose port 8500 for the backend
EXPOSE 8500

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Start the backend server
CMD ["python", "run_backend.py"]