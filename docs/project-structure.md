# Project Structure Analysis

## Repository Type
**Multi-part project** - 2 distinct parts in single repository

## Project Parts

### Part 1: Backend
- **Part ID:** backend
- **Root Path:** /home/ishanp/Documents/GitHub/LipSyncAutomation/backend
- **Project Type:** backend
- **Primary Language:** Python
- **Framework:** FastAPI
- **Entry Point:** backend/app/main.py
- **Key Technologies:** FastAPI, uvicorn, websockets, Pydantic, moviepy, librosa

### Part 2: Frontend
- **Part ID:** frontend  
- **Root Path:** /home/ishanp/Documents/GitHub/LipSyncAutomation/frontend
- **Project Type:** web
- **Primary Language:** TypeScript/JavaScript
- **Framework:** Next.js 16
- **Entry Point:** frontend/src/app/layout.tsx
- **Key Technologies:** Next.js, React 19, TypeScript, Tailwind CSS, Zustand

## Integration Architecture
- **Communication:** REST API + WebSocket
- **Data Flow:** Frontend → Backend API → Processing Services
- **Real-time:** WebSocket for progress updates
- **File Upload:** Multipart form data to backend

## Technology Stack Summary
- **Backend:** Python 3.8+ with FastAPI
- **Frontend:** Next.js 16 with React 19
- **Database:** File-based (profiles, presets)
- **Real-time:** WebSocket connection
- **Deployment:** Docker containers (docker-compose.yml)