# LipSyncAutomation Web UI

A web interface for the LipSyncAutomation v2.0 system, built with FastAPI (backend) and Next.js (frontend).

## Features

- Dashboard to monitor system status and processing jobs
- Profile management for character animations
- Audio processing with cinematic effects
- Real-time job status updates via WebSocket
- Settings configuration

## Architecture

- **Backend**: FastAPI server running on port 8001
- **Frontend**: Next.js application with React components
- **Communication**: REST API and WebSocket for real-time updates

## Prerequisites

- Python 3.8+
- Node.js 18+ and npm/yarn

## Setup Instructions

### Backend Setup

1. Navigate to the project root directory:
```bash
cd /path/to/LipSyncAutomation
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install the main project and web dependencies:
```bash
pip install -e .
pip install fastapi uvicorn python-multipart python-socketio websockets pyjwt bcrypt python-slugify fastapi-socketio
```

4. Start the backend server:
```bash
python web-ui/backend/main.py
```
The backend will be available at `http://localhost:8001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd web-ui/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

### GET endpoints
- `/` - Root endpoint
- `/api/health` - Health check
- `/api/system-info` - System information
- `/api/profiles` - List all profiles
- `/api/profiles/{profile_name}` - Get specific profile
- `/api/jobs` - Get all processing jobs
- `/api/jobs/{job_id}` - Get specific job

### POST endpoints
- `/api/process` - Start a new processing job
- `/api/profiles` - Create a new profile
- `/upload` - Upload audio files

### WebSocket endpoint
- `/ws/processing-status` - Real-time job status updates

## Development

For development, both the backend and frontend need to run simultaneously for full functionality.

## Production Deployment

For production deployment, the Next.js application should be built using `npm run build` and can be deployed as a static site. The FastAPI backend should be run with a production ASGI server like Gunicorn.

## Troubleshooting

- If the backend doesn't start, ensure all dependencies are installed in your virtual environment
- If the frontend can't connect to the backend, verify that the backend is running and check CORS configurations
- Check the browser console for any API connection errors