# Docker, CI/CD, and Deployment Configuration Strategy

## Overview

This document outlines the comprehensive strategy for updating Docker, CI/CD pipelines, and deployment configurations to support the new forked frontend/backend architecture.

## Current Configuration Analysis

### Existing Docker Setup
- **Root docker-compose.yml**: Orchestrates both frontend and backend
- **Dockerfile.backend**: Python backend container
- **Dockerfile.frontend**: Node.js frontend container
- **Volume mappings**: Complex due to monolithic structure

### Current CI/CD
- **GitHub Actions**: Only frontend performance testing
- **Limited automation**: No backend testing or integration tests
- **Manual deployment**: No automated deployment pipelines

## Updated Docker Configuration

### 1. New Root Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: lipsync_backend
    ports:
      - "8500:8500"
    volumes:
      - ./backend:/app
      - profiles_data:/app/profiles
      - cache_data:/app/cache
      - output_data:/app/output
      - uploads_data:/app/uploads
    environment:
      - PYTHONPATH=/app/src
      - PYTHONUNBUFFERED=1
      - ENVIRONMENT=development
    networks:
      - lipsync_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8500/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: lipsync_frontend
    ports:
      - "3000:3000"
    depends_on:
      backend:
        condition: service_healthy
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:8500
      - NEXT_PUBLIC_WS_URL=ws://localhost:8500
    networks:
      - lipsync_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: lipsync_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deployment/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./deployment/nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - lipsync_network
    restart: unless-stopped

networks:
  lipsync_network:
    driver: bridge

volumes:
  profiles_data:
  cache_data:
  output_data:
  uploads_data:
```

### 2. Production Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    image: lipsync/backend:${VERSION:-latest}
    container_name: lipsync_backend_prod
    ports:
      - "8500:8500"
    volumes:
      - profiles_data:/app/profiles
      - cache_data:/app/cache
      - output_data:/app/output
      - uploads_data:/app/uploads
    environment:
      - PYTHONPATH=/app/src
      - PYTHONUNBUFFERED=1
      - ENVIRONMENT=production
      - LOG_LEVEL=INFO
    networks:
      - lipsync_network
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8500/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  frontend:
    image: lipsync/frontend:${VERSION:-latest}
    container_name: lipsync_frontend_prod
    ports:
      - "3000:3000"
    depends_on:
      backend:
        condition: service_healthy
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.lipsync.example.com
      - NEXT_PUBLIC_WS_URL=wss://api.lipsync.example.com
    networks:
      - lipsync_network
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  nginx:
    image: nginx:alpine
    container_name: lipsync_nginx_prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deployment/nginx/nginx.prod.conf:/etc/nginx/nginx.conf
      - ./deployment/nginx/ssl:/etc/nginx/ssl
      - static_files:/var/www/static
    depends_on:
      - frontend
      - backend
    networks:
      - lipsync_network
    restart: always

networks:
  lipsync_network:
    driver: bridge

volumes:
  profiles_data:
  cache_data:
  output_data:
  uploads_data:
  static_files:
```

### 3. Backend Dockerfile
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/
COPY config/ ./config/

# Create necessary directories
RUN mkdir -p profiles cache output uploads

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8500/api/health || exit 1

# Expose port
EXPOSE 8500

# Run the application
CMD ["python", "-m", "lipsync_automation.api.main"]
```

### 4. Frontend Dockerfile
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 5. Development Dockerfiles
```dockerfile
# backend/Dockerfile.dev
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src

RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install development dependencies
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt

# Copy source code
COPY src/ ./src/
COPY config/ ./config/

# Create directories
RUN mkdir -p profiles cache output uploads

EXPOSE 8500

CMD ["python", "-m", "lipsync_automation.api.main"]
```

```dockerfile
# frontend/Dockerfile.dev
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

## CI/CD Pipeline Configuration

### 1. Backend CI Pipeline
```yaml
# .github/workflows/backend-ci.yml
name: Backend CI

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'backend/**'
      - 'shared/**'
  pull_request:
    branches: [ main ]
    paths:
      - 'backend/**'
      - 'shared/**'

env:
  PYTHON_VERSION: '3.11'
  NODE_VERSION: '18'

jobs:
  lint:
    name: Lint Code
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
          
      - name: Run linting
        run: |
          cd backend
          flake8 src/
          black --check src/
          isort --check-only src/
          mypy src/

  test:
    name: Run Tests
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.9', '3.10', '3.11']
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}
          
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
          
      - name: Run tests
        run: |
          cd backend
          pytest tests/ -v --cov=src --cov-report=xml
          
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: backend/coverage.xml
          flags: backend
          name: backend-coverage

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install safety bandit
          
      - name: Run security scans
        run: |
          cd backend
          safety check -r requirements.txt
          bandit -r src/

  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [lint, test, security]
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        
      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}/backend
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}
            
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### 2. Frontend CI Pipeline
```yaml
# .github/workflows/frontend-ci.yml
name: Frontend CI

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'frontend/**'
      - 'shared/**'
  pull_request:
    branches: [ main ]
    paths:
      - 'frontend/**'
      - 'shared/**'

env:
  NODE_VERSION: '18'

jobs:
  lint:
    name: Lint Code
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
          
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Run linting
        run: |
          cd frontend
          npm run lint
          npm run type-check

  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
          
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Run tests
        run: |
          cd frontend
          npm run test:coverage
          
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: frontend/coverage/lcov.info
          flags: frontend
          name: frontend-coverage

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
          
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Install Playwright
        run: |
          cd frontend
          npx playwright install --with-deps
          
      - name: Build application
        run: |
          cd frontend
          npm run build
          
      - name: Run E2E tests
        run: |
          cd frontend
          npm run test:e2e
          
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/

  accessibility:
    name: Accessibility Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
          
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Build application
        run: |
          cd frontend
          npm run build
          
      - name: Run accessibility tests
        run: |
          cd frontend
          npm run test:accessibility

  performance:
    name: Performance Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
          
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Build application
        run: |
          cd frontend
          npm run build
          
      - name: Run Lighthouse CI
        run: |
          cd frontend
          npm run test:performance

  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [lint, test, e2e]
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        
      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}/frontend
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}
            
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### 3. Integration Testing Pipeline
```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  integration-test:
    name: Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        
      - name: Build development images
        run: |
          docker build -t lipsync/backend:test -f backend/Dockerfile.dev ./backend
          docker build -t lipsync/frontend:test -f frontend/Dockerfile.dev ./frontend
          
      - name: Start services
        run: |
          docker-compose -f docker-compose.test.yml up -d
          
      - name: Wait for services
        run: |
          timeout 300 bash -c 'until curl -f http://localhost:8500/api/health; do sleep 5; done'
          timeout 300 bash -c 'until curl -f http://localhost:3000; do sleep 5; done'
          
      - name: Run integration tests
        run: |
          docker-compose -f docker-compose.test.yml exec -T backend pytest tests/integration/ -v
          
      - name: Run API contract tests
        run: |
          docker-compose -f docker-compose.test.yml exec -T backend python -m scripts.test_api_contracts
          
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: integration-test-results
          path: backend/tests/reports/
          
      - name: Cleanup
        if: always()
        run: |
          docker-compose -f docker-compose.test.yml down -v
```

### 4. Deployment Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  workflow_run:
    workflows: ["Backend CI", "Frontend CI"]
    types:
      - completed
    branches: [main]

environment:
  name: production

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to production
        runs-on: ubuntu-latest
        steps:
          - name: Deploy to server
            uses: appleboy/ssh-action@v1.0.0
            with:
              host: ${{ secrets.PROD_HOST }}
              username: ${{ secrets.PROD_USER }}
              key: ${{ secrets.PROD_SSH_KEY }}
              script: |
                cd /opt/lipsync-automation
                git pull origin main
                docker-compose -f docker-compose.prod.yml pull
                docker-compose -f docker-compose.prod.yml up -d
                docker system prune -f
                
      - name: Run smoke tests
        run: |
          sleep 60
          curl -f https://api.lipsync.example.com/api/health
          curl -f https://lipsync.example.com
          
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        if: always()
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Deployment Configuration

### 1. Nginx Configuration
```nginx
# deployment/nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8500;
    }
    
    upstream frontend {
        server frontend:3000;
    }
    
    server {
        listen 80;
        server_name lipsync.example.com;
        
        # Redirect to HTTPS
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name lipsync.example.com;
        
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Backend API
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # WebSocket
        location /ws/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    
    server {
        listen 443 ssl http2;
        server_name api.lipsync.example.com;
        
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        # Backend API only
        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 2. Kubernetes Deployment
```yaml
# deployment/kubernetes/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lipsync-backend
  labels:
    app: lipsync-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lipsync-backend
  template:
    metadata:
      labels:
        app: lipsync-backend
    spec:
      containers:
      - name: backend
        image: ghcr.io/your-org/lipsync-automation/backend:latest
        ports:
        - containerPort: 8500
        env:
        - name: PYTHONPATH
          value: "/app/src"
        - name: ENVIRONMENT
          value: "production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8500
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 8500
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: profiles
          mountPath: /app/profiles
        - name: cache
          mountPath: /app/cache
      volumes:
      - name: profiles
        persistentVolumeClaim:
          claimName: profiles-pvc
      - name: cache
        persistentVolumeClaim:
          claimName: cache-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: lipsync-backend-service
spec:
  selector:
    app: lipsync-backend
  ports:
    - protocol: TCP
      port: 8500
      targetPort: 8500
  type: ClusterIP
```

```yaml
# deployment/kubernetes/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lipsync-frontend
  labels:
    app: lipsync-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: lipsync-frontend
  template:
    metadata:
      labels:
        app: lipsync-frontend
    spec:
      containers:
      - name: frontend
        image: ghcr.io/your-org/lipsync-automation/frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: NEXT_PUBLIC_API_URL
          value: "https://api.lipsync.example.com"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "250m"
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: lipsync-frontend-service
spec:
  selector:
    app: lipsync-frontend
  ports:
    - protocol: TCP
      port: 3000
      targetPort: 3000
  type: ClusterIP
```

### 3. Ingress Configuration
```yaml
# deployment/kubernetes/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: lipsync-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  tls:
  - hosts:
    - lipsync.example.com
    - api.lipsync.example.com
    secretName: lipsync-tls
  rules:
  - host: lipsync.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: lipsync-frontend-service
            port:
              number: 3000
  - host: api.lipsync.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: lipsync-backend-service
            port:
              number: 8500
```

## Environment Configuration

### 1. Environment Variables
```bash
# .env.example
# Backend Configuration
PYTHONPATH=/app/src
ENVIRONMENT=development
LOG_LEVEL=INFO
API_HOST=0.0.0.0
API_PORT=8500

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/lipsync
REDIS_URL=redis://localhost:6379

# External Services
RHUBARB_PATH=/usr/local/bin/rhubarb
FFMPEG_PATH=/usr/bin/ffmpeg

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret-here

# Frontend Configuration
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8500
NEXT_PUBLIC_WS_URL=ws://localhost:8500
NEXT_PUBLIC_APP_NAME=LipSync Automation
NEXT_PUBLIC_APP_VERSION=2.0.0
```

### 2. Docker Compose Override
```yaml
# docker-compose.override.yml
version: '3.8'

services:
  backend:
    environment:
      - ENVIRONMENT=development
      - LOG_LEVEL=DEBUG
    volumes:
      - ./backend/src:/app/src
      - ./backend/config:/app/config
    command: ["python", "-m", "lipsync_automation.api.main", "--reload"]

  frontend:
    environment:
      - NODE_ENV=development
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/public:/app/public
    command: ["npm", "run", "dev"]
```

## Monitoring and Logging

### 1. Health Checks
```python
# backend/src/lipsync_automation/api/health.py
from fastapi import APIRouter
from psutil import virtual_memory, cpu_percent
import asyncio

router = APIRouter()

@router.get("/health")
async def health_check():
    """Basic health check"""
    return {"status": "healthy"}

@router.get("/health/detailed")
async def detailed_health():
    """Detailed health check with system metrics"""
    memory = virtual_memory()
    cpu = cpu_percent()
    
    return {
        "status": "healthy",
        "system": {
            "memory_percent": memory.percent,
            "cpu_percent": cpu,
        },
        "services": {
            "database": "healthy",  # Add actual DB check
            "redis": "healthy",     # Add actual Redis check
        }
    }
```

### 2. Logging Configuration
```yaml
# backend/config/logging.yml
version: 1
disable_existing_loggers: false

formatters:
  default:
    format: '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
  json:
    format: '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}'

handlers:
  console:
    class: logging.StreamHandler
    formatter: json
    stream: ext://sys.stdout
    
  file:
    class: logging.handlers.RotatingFileHandler
    formatter: json
    filename: /app/logs/app.log
    maxBytes: 10485760  # 10MB
    backupCount: 5

loggers:
  lipsync_automation:
    level: INFO
    handlers: [console, file]
    propagate: false

root:
  level: INFO
  handlers: [console]
```

## Migration Checklist

### Pre-Migration
- [ ] Document current deployment process
- [ ] Backup existing configurations
- [ ] Set up container registry
- [ ] Configure secrets management

### Migration Execution
- [ ] Create new Docker configurations
- [ ] Set up CI/CD pipelines
- [ ] Configure deployment environments
- [ ] Set up monitoring and logging
- [ ] Create deployment scripts

### Post-Migration Validation
- [ ] All CI/CD pipelines work
- [ ] Docker images build successfully
- [ ] Deployment to staging works
- [ ] Monitoring and logging function
- [ ] Rollback procedures tested

This comprehensive Docker, CI/CD, and deployment configuration strategy ensures that the forked frontend/backend architecture can be properly developed, tested, and deployed with modern DevOps practices.