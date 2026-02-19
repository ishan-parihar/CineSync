# Data Models Documentation

## Overview
This document analyzes the data models, type definitions, and data structures used throughout the LipSyncAutomation system.

## Backend Data Models

### API Response Models
**File**: `backend/app/api/models.py`

#### Core Response Structure
```python
class StandardAPIResponse(BaseModel):
    success: bool                    # Request success status
    data: Optional[Any]             # Response payload
    error: Optional[ErrorDetail]    # Error information if failed
    metadata: ResponseMetadata      # Request metadata
```

#### Error Detail Model
```python
class ErrorDetail(BaseModel):
    code: str                       # Machine-readable error code
    message: str                    # Human-readable error message
    details: Optional[Dict[str, Any]]  # Additional error context
```

#### Response Metadata
```python
class ResponseMetadata(BaseModel):
    timestamp: str                  # ISO 8601 timestamp
    request_id: str                 # Unique request identifier
    version: str = "1.0.0"         # API version
    processing_time_ms: Optional[float]  # Processing time in ms
```

### Service Layer Data Structures

#### Profile Service Models
**File**: `backend/app/services/profile_service.py`

**Key Data Structures**:
- **Profile**: Character profile with angles, emotions, and visemes
- **Angle**: Camera angle configuration
- **Emotion**: Emotional state configuration
- **Viseme**: Visual mouth shape for phoneme mapping

**Profile Structure**:
```python
{
    "profile_name": str,
    "supported_angles": List[str],
    "supported_emotions": List[str],
    "validation": {
        "is_valid": bool,
        "missing_angles": List[str],
        "missing_emotions": List[str],
        "missing_visemes": List[str]
    }
}
```

#### Emotion Service Models
**File**: `backend/app/services/emotion_service.py`

**Key Data Structures**:
- **EmotionAnalysis**: Complete emotion analysis results
- **EmotionSegment**: Time-based emotion segments
- **EmotionAdjustment**: Manual emotion adjustments

**Emotion Analysis Structure**:
```python
{
    "job_id": str,
    "duration": float,
    "overall_emotion": str,
    "overall_confidence": float,
    "segments": [
        {
            "start_time": float,
            "end_time": float,
            "emotion": str,
            "confidence": float,
            "intensity": float
        }
    ]
}
```

#### Cinematography Service Models
**File**: `backend/app/services/cinematography_service.py`

**Key Data Structures**:
- **CinematographyConfig**: Shot composition rules
- **ShotDecision**: Camera shot decisions
- **CinematographyOverride**: Manual overrides

**Shot Decision Structure**:
```python
{
    "timestamp": float,
    "emotion": str,
    "selected_shot": str,
    "vertical_angle": str,
    "confidence": float,
    "reasoning": str,
    "alternatives": List[str]
}
```

## Frontend Data Models

### Type Definitions
**File**: `frontend/src/types/index.ts` (inferred from usage)

#### Core System Types
```typescript
// Job Management
interface Job {
  id: string;
  profile_id: string;
  audio_file: string;
  job_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  progress: number;
  stages: ProcessingStage[];
}

// Processing Stages
interface ProcessingStage {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  started_at?: string;
  completed_at?: string;
  error?: string;
}

// WebSocket Events
interface WebSocketEvent {
  type: string;
  timestamp: string;
  data?: any;
  job_id?: string;
}
```

#### Profile Management Types
```typescript
// Profile Configuration
interface ProfileConfig {
  profile_name: string;
  supported_angles: string[];
  supported_emotions: string[];
  validation: ProfileValidation;
  created_at: string;
  updated_at: string;
}

// Profile Validation
interface ProfileValidation {
  is_valid: boolean;
  missing_angles: string[];
  missing_emotions: string[];
  missing_visemes: string[];
  total_visemes: number;
  required_visemes: number;
}

// Viseme Data
interface Viseme {
  name: string;
  emotion: string;
  angle: string;
  image_path: string;
  file_size: number;
  uploaded_at: string;
}
```

#### Emotion Analysis Types
```typescript
// Emotion Analysis Result
interface EmotionAnalysis {
  job_id: string;
  duration: number;
  overall_emotion: string;
  overall_confidence: number;
  segments: EmotionSegment[];
}

// Individual Emotion Segment
interface EmotionSegment {
  start_time: number;
  end_time: number;
  emotion: string;
  confidence: number;
  intensity: number;
  phoneme_mapping?: string;
}

// Emotion Analysis Events
interface EmotionSegmentEvent {
  type: 'emotion_segment_processed';
  timestamp: string;
  job_id: string;
  segment: EmotionSegment;
  progress: number;
}
```

#### Cinematography Types
```typescript
// Cinematography Configuration
interface CinematographyConfig {
  shot_rules: ShotRule[];
  emotion_mappings: EmotionMapping[];
  default_angles: Record<string, string>;
  tension_thresholds: TensionThreshold;
}

// Shot Rules
interface ShotRule {
  emotion: string;
  preferred_shots: string[];
  vertical_angles: string[];
  confidence_threshold: number;
}

// Shot Decision Events
interface ShotDecisionEvent {
  type: 'shot_decision_made';
  timestamp: string;
  job_id: string;
  emotion: string;
  selected_shot: string;
  vertical_angle: string;
  confidence: number;
  reasoning: string;
  alternatives: string[];
}
```

#### System Monitoring Types
```typescript
// System Performance Metrics
interface SystemPerformance {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  active_jobs: number;
  uptime: number;
  timestamp: string;
}

// WebSocket Connection Status
interface ConnectionStatus {
  is_connected: boolean;
  state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'destroyed';
  last_error?: string;
  connection_stats?: ConnectionStats;
}

// Connection Statistics
interface ConnectionStats {
  connected_at: string;
  messages_received: number;
  messages_sent: number;
  last_ping: string;
  latency: number;
}
```

### Store State Models

#### Zustand Store Structure
**File**: `frontend/src/stores/`

##### App Store (Legacy/Global)
```typescript
interface AppStore {
  // Profile Management
  profiles: any[];
  activeProfile: any | null;
  
  // Processing State
  activeJobs: Job[];
  processingQueue: Job[];
  currentJob: Job | null;
  
  // Analysis Data
  emotionAnalysis: EmotionAnalysis | null;
  shotSequence: any[];
  cinematographyConfig: CinematographyConfig | null;
  
  // Real-time Events
  recentEvents: WebSocketEvent[];
  processingStages: Record<string, any>;
  
  // UI State
  selectedSegments: number[];
  previewMode: 'storyboard' | 'timeline' | 'detailed';
  showConfidence: boolean;
  showTension: boolean;
  gridColumns: number;
  
  // WebSocket Connection
  isConnected: boolean;
  connectionState: ConnectionState;
  connectionStats: any | null;
  lastWebSocketError: string | null;
}
```

##### Specialized Stores

###### Profiles Store
```typescript
interface ProfilesStore {
  // Data
  profiles: ProfileConfig[];
  activeProfileId: string | null;
  selectedProfileId: string | null;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  
  // Computed
  activeProfile: ProfileConfig | null;
  selectedProfile: ProfileConfig | null;
  
  // Actions
  loadProfiles: () => Promise<void>;
  createProfile: (profileData: Partial<ProfileConfig>) => Promise<ProfileConfig>;
  updateProfile: (profileName: string, updates: Partial<ProfileConfig>) => Promise<void>;
  deleteProfile: (profileName: string) => Promise<void>;
  setActiveProfile: (profileId: string | null) => void;
  setSelectedProfile: (profileId: string | null) => void;
}
```

###### Processing Store
```typescript
interface ProcessingStore {
  // Data
  allJobs: Job[];
  currentJobId: string | null;
  selectedJobId: string | null;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  
  // Computed
  activeJobs: Job[];
  completedJobs: Job[];
  currentJob: Job | null;
  selectedJob: Job | null;
  isProcessing: boolean;
  
  // Actions
  loadJobs: () => Promise<void>;
  createJob: (jobData: Partial<Job>) => Promise<Job>;
  cancelJob: (jobId: string) => Promise<void>;
  retryJob: (jobId: string) => Promise<void>;
  setCurrentJob: (jobId: string | null) => void;
  setSelectedJob: (jobId: string | null) => void;
}
```

###### Cinematography Store
```typescript
interface CinematographyStore {
  // Data
  emotionAnalysis: EmotionAnalysis | null;
  shotDecisions: ShotDecisionEvent[];
  cinematographyConfig: CinematographyConfig | null;
  selectedShotIndex: number | null;
  selectedSegmentIndex: number | null;
  viewMode: 'timeline' | 'storyboard' | 'detailed';
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  
  // Actions
  loadEmotionAnalysis: (jobId: string) => Promise<void>;
  loadCinematographyConfig: () => Promise<void>;
  setSelectedShot: (index: number | null) => void;
  setSelectedSegment: (index: number | null) => void;
  setViewMode: (mode: ViewMode) => void;
}
```

###### System Store
```typescript
interface SystemStore {
  // Data
  performance: SystemPerformance | null;
  connectionStatus: ConnectionStatus;
  systemEvents: SystemEvent[];
  logs: LogEntry[];
  alerts: SystemAlert[];
  metrics: MetricPoint[];
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  
  // Actions
  performHealthCheck: () => Promise<void>;
  loadSystemPerformance: () => Promise<void>;
  addSystemEvent: (event: SystemEvent) => void;
  addLog: (log: LogEntry) => void;
  setConnectionStatus: (connected: boolean) => void;
}
```

###### UI Store
```typescript
interface UIStore {
  // Navigation
  currentRoute: string;
  breadcrumbs: Breadcrumb[];
  
  // Panels and Layout
  panels: Record<string, boolean>;
  sidebarOpen: boolean;
  
  // Notifications
  notifications: Notification[];
  
  // Modals
  activeModal: string | null;
  modalData: any;
  
  // Workspace
  workspace: {
    unsavedChanges: boolean;
    lastSaved: string | null;
  };
  
  // Loading and Errors
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  
  // Actions
  setCurrentRoute: (route: string) => void;
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
  togglePanel: (panel: string) => void;
  addNotification: (notification: Notification) => void;
  openModal: (modal: string, data?: any) => void;
  closeModal: () => void;
}
```

## Data Validation Patterns

### Backend Validation
- **Pydantic Models**: Strong typing with automatic validation
- **Custom Validators**: Business logic validation in services
- **Error Handling**: Structured error responses with codes

### Frontend Validation
- **TypeScript Types**: Compile-time type checking
- **Runtime Validation**: User input validation in components
- **API Response Validation**: Type guards for API responses

## Data Flow Patterns

### 1. Profile Data Flow
```
User Input → Frontend Validation → API Request → Backend Validation → Database Storage
                ↓
UI Update ← Store Update ← WebSocket Event ← Processing Complete
```

### 2. Processing Data Flow
```
File Upload → Job Creation → Processing Stages → Real-time Updates → Completion
     ↓              ↓              ↓              ↓              ↓
Store Update → WebSocket Events → UI Updates → Progress Bars → Results
```

### 3. Configuration Data Flow
```
Settings Panel → Local State → API Update → Backend Storage → WebSocket Sync
```

## Data Persistence Strategy

### Backend Persistence
- **Profile Data**: JSON file storage in `profiles/` directory
- **Cache Data**: Temporary storage in `cache/` directory
- **Output Data**: Generated content in `output/` directory
- **Configuration**: Environment variables and config files

### Frontend Persistence
- **Application State**: In-memory Zustand stores
- **User Preferences**: LocalStorage
- **Workspace State**: LocalStorage with auto-save
- **Session Data**: SessionStorage for temporary state

## Data Synchronization

### Real-time Synchronization
- **WebSocket Events**: Live updates for processing status
- **Store Event Bus**: Cross-store communication
- **Optimistic Updates**: UI updates before server confirmation

### Conflict Resolution
- **Last-Writer-Wins**: For simple configuration updates
- **User Prompts**: For conflicting operations
- **Merge Strategies**: For complex data structure updates

## Data Security Considerations

### Sensitive Data
- **File Paths**: Sanitized in responses
- **System Information**: Limited exposure
- **Error Messages**: Sanitized for client consumption

### Data Validation
- **Input Sanitization**: User input validation
- **File Upload Security**: Type and size validation
- **SQL Injection Prevention**: Parameterized queries (if applicable)

---

**Analysis Date**: 2025-11-10  
**Scan Depth**: Deep Analysis  
**Type System**: Python Pydantic + TypeScript  
**State Management**: Zustand with cross-store orchestration