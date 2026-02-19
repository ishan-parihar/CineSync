# Deployment Configuration Documentation

## Overview
This document analyzes the deployment configurations, containerization strategy, and infrastructure setup for the LipSyncAutomation system.

## Container Architecture

### Docker Compose Configuration
**File**: `docker-compose.yml`

#### Service Architecture
```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: lipsync_backend
    ports:
      - "8001:8500"
    volumes:
      - ./backend:/app                    # Development hot-reload
      - ./profiles:/app/profiles          # Profile data persistence
      - ./cache:/app/cache                # Cache storage
      - ./output:/app/output              # Generated content
      - ./shared:/app/shared              # Shared resources
    environment:
      - PYTHONPATH=/app
      - PYTHONUNBUFFERED=1
    networks:
      - lipsync_network
    restart: unless-stopped
    command: ["python", "run_backend.py"]

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: lipsync_frontend
    ports:
      - "5000:3000"
    depends_on:
      - backend
    volumes:
      - ./frontend:/app                  # Development hot-reload
      - /app/node_modules                 # Preserve node_modules
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8001
      - NODE_ENV=development
    networks:
      - lipsync_network
    restart: unless-stopped
```

#### Network Configuration
```yaml
networks:
  lipsync_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

#### Volume Strategy
- **Development**: Bind mounts for hot-reload
- **Production**: Named volumes for data persistence
- **Shared Resources**: Cross-service volume mounts

## Backend Deployment Configuration

### Dockerfile Analysis
**File**: `backend/Dockerfile`

```dockerfile
# Multi-stage build strategy
FROM python:3.11-slim as base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/profiles /app/cache /app/output /app/shared

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8500

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8500/api/health || exit 1

# Run application
CMD ["python", "run_backend.py"]
```

#### Production Optimizations
- **Multi-stage builds**: Reduce image size
- **Health checks**: Container health monitoring
- **Non-root user**: Security best practices
- **Minimal base image**: Reduce attack surface

### Environment Configuration
**File**: `.env` (shared)

```bash
# System Configuration
PYTHONPATH=/app
PYTHONUNBUFFERED=1
LOG_LEVEL=INFO

# Database Configuration (if applicable)
DATABASE_URL=postgresql://user:password@localhost:5432/lipsync

# Redis Configuration (if applicable)
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000,http://localhost:5000

# Performance
MAX_WORKERS=4
WORKER_TIMEOUT=120
```

## Frontend Deployment Configuration

### Dockerfile Analysis
**File**: `frontend/Dockerfile`

```dockerfile
# Multi-stage build
FROM node:18-alpine as base

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine as runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy build artifacts
COPY --from=base /app/public ./public
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static

# Set permissions
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "server.js"]
```

#### Next.js Configuration
**File**: `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // API proxy configuration
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },
  
  // Build optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

## Development vs Production Configuration

### Development Configuration
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  backend:
    volumes:
      - ./backend:/app                    # Hot-reload
      - ./profiles:/app/profiles
    environment:
      - NODE_ENV=development
      - DEBUG=1
    command: ["python", "run_backend.py", "--reload"]

  frontend:
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:8001
    command: ["npm", "run", "dev"]
```

### Production Configuration
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    volumes:
      - profiles_data:/app/profiles      # Named volume
      - cache_data:/app/cache
      - output_data:/app/output
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G

  frontend:
    volumes: []                           # No bind mounts
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.yourdomain.com
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 1G

volumes:
  profiles_data:
  cache_data:
  output_data:
```

## Infrastructure Configuration

### Kubernetes Deployment (Optional)
**File**: `k8s/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lipsync-backend
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
        image: lipsync/backend:latest
        ports:
        - containerPort: 8500
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: lipsync-secrets
              key: database-url
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
    port: 80
    targetPort: 8500
  type: ClusterIP
```

### Nginx Reverse Proxy
**File**: `nginx/nginx.conf`

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server lipsync-backend:8500;
    }
    
    upstream frontend {
        server lipsync-frontend:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;

    server {
        listen 80;
        server_name yourdomain.com;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # File upload endpoints
        location /upload {
            limit_req zone=upload burst=5 nodelay;
            client_max_body_size 100M;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket
        location /ws {
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
}
```

## Monitoring and Logging

### Health Checks
**Backend Health Check**:
```python
# backend/app/api/monitoring/endpoints.py
@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "checks": {
            "database": await check_database(),
            "redis": await check_redis(),
            "disk_space": await check_disk_space(),
            "memory": await check_memory_usage()
        }
    }
```

**Frontend Health Check**:
```typescript
// frontend/src/pages/api/health.ts
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime()
  });
}
```

### Logging Configuration
**Backend Logging**:
```python
# backend/app/logging_config.py
import logging
import sys
from pathlib import Path

def setup_logging():
    # Create logs directory
    Path("logs").mkdir(exist_ok=True)
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('/app/logs/application.log'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Set specific logger levels
    logging.getLogger('uvicorn').setLevel(logging.INFO)
    logging.getLogger('fastapi').setLevel(logging.INFO)
```

### Monitoring Stack (Optional)
```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro

volumes:
  grafana_data:
```

## Security Configuration

### Environment Security
```bash
# .env.production
# Use secure, randomly generated values
SECRET_KEY=$(openssl rand -hex 32)
CORS_ORIGINS=https://yourdomain.com
DATABASE_URL=postgresql://user:secure_password@db:5432/lipsync

# Disable debug in production
DEBUG=false
NODE_ENV=production

# Rate limiting
RATE_LIMIT_PER_MINUTE=60
UPLOAD_RATE_LIMIT_PER_MINUTE=10
```

### Container Security
```dockerfile
# Security best practices in Dockerfile
FROM python:3.11-slim as base

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Install security updates
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Set proper permissions
COPY --chown=appuser:appuser . /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8500/api/health || exit 1
```

### SSL/TLS Configuration
```nginx
# nginx/ssl.conf
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.com.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Other security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Application configuration...
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Deployment Scripts

### Build and Deploy Script
```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "Starting deployment..."

# Build and push images
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml push

# Deploy to production
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 30

# Run health checks
if curl -f http://localhost:5000/api/health; then
    echo "Frontend is healthy"
else
    echo "Frontend health check failed"
    exit 1
fi

if curl -f http://localhost:8001/api/health; then
    echo "Backend is healthy"
else
    echo "Backend health check failed"
    exit 1
fi

echo "Deployment completed successfully!"
```

### Backup Script
```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup profiles
docker run --rm -v lipsync_profiles_data:/data -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/profiles.tar.gz -C /data .

# Backup database (if applicable)
docker exec lipsync-db pg_dump -U postgres lipsync > $BACKUP_DIR/database.sql

# Upload to cloud storage (optional)
# aws s3 sync $BACKUP_DIR s3://your-backup-bucket/$(basename $BACKUP_DIR)/

echo "Backup completed: $BACKUP_DIR"
```

## Performance Optimization

### Resource Limits
```yaml
# Production resource constraints
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
    ulimits:
      nofile:
        soft: 65536
        hard: 65536

  frontend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
```

### Caching Strategy
```nginx
# Static asset caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# API response caching
location /api/system-info {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_key $request_uri;
}
```

---

**Analysis Date**: 2025-11-10  
**Scan Depth**: Deep Analysis  
**Container Platform**: Docker + Docker Compose  
**Web Server**: Nginx (production)  
**Orchestration**: Kubernetes (optional)