/**
 * Comprehensive TypeScript type definitions for LipSyncAutomation frontend
 * Supports standardized API responses, WebSocket events, and all system components
 * @version 2.0.0
 * @author Frontend Development Team
 */

// ============================================================================
// STANDARDIZED API RESPONSE TYPES
// ============================================================================

/**
 * Error detail structure for API responses
 */
export interface ErrorDetail {
  /** Machine-readable error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error context or validation details */
  details?: Record<string, any>;
}

/**
 * Response metadata for all API calls
 */
export interface ResponseMetadata {
  /** ISO 8601 timestamp of response */
  timestamp: string;
  /** Unique request identifier for tracking */
  request_id: string;
  /** API version */
  version: string;
  /** Processing time in milliseconds */
  processing_time_ms?: number;
}

/**
 * Standardized API response wrapper for all endpoints
 */
export interface APIResponse<T = any> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data payload */
  data?: T;
  /** Error information if request failed */
  error?: ErrorDetail;
  /** Response metadata */
  metadata: ResponseMetadata;
}

/**
 * Generic API response type for endpoints with no data payload
 */
export type EmptyAPIResponse = APIResponse<null>;

/**
 * Pagination metadata for list endpoints
 */
export interface PaginationMetadata {
  /** Current page number */
  page: number;
  /** Items per page */
  per_page: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  total_pages: number;
  /** Whether there's a next page */
  has_next: boolean;
  /** Whether there's a previous page */
  has_prev: boolean;
}

/**
 * Paginated API response
 */
export interface PaginatedAPIResponse<T> extends APIResponse<T[]> {
  /** Pagination metadata */
  pagination: PaginationMetadata;
}

// ============================================================================
// ERROR CODES ENUM
// ============================================================================

/**
 * Standardized error codes used across the API
 */
export enum ErrorCodes {
  // General errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  INVALID_REQUEST = "INVALID_REQUEST",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  
  // File and upload errors
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  INVALID_FILE_TYPE = "INVALID_FILE_TYPE",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  UPLOAD_FAILED = "UPLOAD_FAILED",
  
  // Processing errors
  PROCESSING_ERROR = "PROCESSING_ERROR",
  PROCESSING_FAILED = "PROCESSING_FAILED",
  JOB_NOT_FOUND = "JOB_NOT_FOUND",
  JOB_ALREADY_RUNNING = "JOB_ALREADY_RUNNING",
  
  // Profile errors
  PROFILE_NOT_FOUND = "PROFILE_NOT_FOUND",
  PROFILE_INVALID = "PROFILE_INVALID",
  PROFILE_ALREADY_EXISTS = "PROFILE_ALREADY_EXISTS",
  
  // Audio analysis errors
  AUDIO_ANALYSIS_FAILED = "AUDIO_ANALYSIS_FAILED",
  INVALID_AUDIO_FORMAT = "INVALID_AUDIO_FORMAT",
  AUDIO_TOO_SHORT = "AUDIO_TOO_SHORT",
  
  // Configuration errors
  CONFIG_ERROR = "CONFIG_ERROR",
  DEPENDENCY_MISSING = "DEPENDENCY_MISSING",
  
  // System errors
  SYSTEM_OVERLOADED = "SYSTEM_OVERLOADED",
  RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
}

// ============================================================================
// EMOTION ANALYSIS TYPES
// ============================================================================

/**
 * Individual emotion segment with timing and dimensional metrics
 */
export interface EmotionSegment {
  /** Start time in seconds */
  start_time: number;
  /** End time in seconds */
  end_time: number;
  /** Primary emotion label */
  emotion: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Valence dimension (-1 to 1, negative to positive) */
  valence: number;
  /** Arousal dimension (0-1, calm to excited) */
  arousal: number;
  /** Optional dominance dimension (0-1, submissive to dominant) */
  dominance?: number;
  /** Secondary emotion if present */
  secondary_emotion?: string;
  /** Secondary emotion confidence */
  secondary_confidence?: number;
}

/**
 * Complete emotion analysis result
 */
export interface EmotionAnalysis {
  /** Array of emotion segments */
  segments: EmotionSegment[];
  /** Overall dominant emotion */
  overall_emotion: string;
  /** Overall confidence score */
  overall_confidence: number;
  /** Total duration in seconds */
  duration: number;
  /** Emotion distribution percentages */
  emotion_distribution?: Record<string, number>;
  /** Average valence across all segments */
  average_valence?: number;
  /** Average arousal across all segments */
  average_arousal?: number;
  /** Emotional complexity score */
  complexity_score?: number;
}

/**
 * Enhanced emotion analysis request parameters
 */
export interface EmotionAnalysisRequest {
  /** Audio file path or identifier */
  audio_file: string;
  /** Profile ID to use for analysis */
  profile_id: string;
  /** Optional emotion intensity modifier */
  intensity_modifier?: number;
  /** Whether to include secondary emotions */
  include_secondary?: boolean;
  /** Custom analysis settings */
  settings?: EmotionAnalysisSettings;
}

/**
 * Settings for emotion analysis
 */
export interface EmotionAnalysisSettings {
  /** Segment length in seconds */
  segment_length?: number;
  /** Overlap between segments */
  segment_overlap?: number;
  /** Minimum confidence threshold */
  min_confidence?: number;
  /** Analysis model to use */
  model?: string;
}

// ============================================================================
// CINEMATOGRAPHY TYPES
// ============================================================================

/**
 * Shot distance types
 */
export type ShotDistance = 'ECU' | 'CU' | 'MCU' | 'MS' | 'MLS' | 'LS';

/**
 * Camera angle types
 */
export type CameraAngle = 'high_angle' | 'eye_level' | 'low_angle' | 'dutch' | 'slight_low' | 'slight_high';

/**
 * Shot purpose categories
 */
export type ShotPurpose = 'dialogue' | 'emotional' | 'narrative' | 'action' | 'reaction' | 'establishing';

/**
 * Individual cinematographic shot decision
 */
export interface ShotDecision {
  /** Emotion that influenced this decision */
  emotion: string;
  /** Selected shot distance */
  selected_shot: ShotDistance;
  /** Vertical camera angle */
  vertical_angle: CameraAngle;
  /** Horizontal camera angle */
  horizontal_angle?: string;
  /** Decision confidence score */
  confidence: number;
  /** AI reasoning for the decision */
  reasoning: string;
  /** Shot start time in seconds */
  start_time: number;
  /** Shot end time in seconds */
  end_time: number;
  /** Purpose of this shot */
  shot_purpose: ShotPurpose;
  /** Duration modifier factor */
  duration_modifier: number;
  /** Transition to next shot */
  transition?: ShotTransition;
}

/**
 * Shot transition information
 */
export interface ShotTransition {
  /** Transition type */
  type: 'cut' | 'dissolve' | 'fade' | 'wipe' | 'slide';
  /** Transition duration in seconds */
  duration: number;
  /** Optional transition direction */
  direction?: 'left' | 'right' | 'up' | 'down';
}

/**
 * Complete shot sequence
 */
export interface ShotSequence {
  /** Array of shot decisions */
  shots: ShotDecision[];
  /** Overall sequence confidence */
  overall_confidence: number;
  /** Total duration in seconds */
  total_duration: number;
  /** Cinematographic style used */
  style: string;
  /** Grammar compliance score */
  grammar_compliance: number;
}

/**
 * Cinematography configuration and rules
 */
export interface CinematographyConfig {
  /** Decision weights */
  weights: {
    emotion_weight: number;
    tension_weight: number;
    grammar_weight: number;
    temporal_smoothing: number;
    shot_duration_range: {
      min: number;
      max: number;
    };
    angle_stability_window: number;
    distance_progression_preference: boolean;
  };
  /** Emotion to shot mappings */
  emotion_mappings: Record<string, {
    primary_shots: ShotDistance[];
    angles: CameraAngle[];
    intensity_bias: number;
  }>;
  /** Tension level mappings */
  tension_mappings: Record<string, ShotDistance[]>;
  /** Grammar rules for shot sequences */
  grammar_rules: {
    distance_progression: {
      allowed_sequences: ShotDistance[][];
      forbidden_sequences: ShotDistance[][];
      progression_penalty: number;
    };
    angle_consistency: {
      '180_degree_rule': boolean;
      axis_break_penalty: number;
      angle_transition_rules: Record<string, string[]>;
    };
    emotional_rhythm: {
      tempo_matching: boolean;
      intensity_matching: boolean;
      valence_continuity: boolean;
    };
  };
}

/**
 * Cinematography override request
 */
export interface CinematographyOverride {
  /** Override type identifier */
  type: 'shot_distance' | 'shot_angle' | 'emotion_intensity' | 'duration' | 'transition';
  /** Override value */
  value: any;
  /** Target timestamp if specific */
  timestamp?: number;
  /** Override priority */
  priority?: number;
  /** Whether validation is required */
  validation_required?: boolean;
}

// ============================================================================
// PROCESSING AND JOB TYPES
// ============================================================================

/**
 * Job status enumeration
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused';

/**
 * Processing stage status
 */
export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'error' | 'skipped';

/**
 * Individual processing stage
 */
export interface ProcessingStage {
  /** Stage identifier */
  name: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Estimated completion time */
  estimated_completion?: string;
  /** Current stage status */
  status: StageStatus;
  /** Stage-specific metadata */
  metadata?: Record<string, any>;
  /** Error information if failed */
  error?: string;
  /** Started timestamp */
  started_at?: string;
  /** Completed timestamp */
  completed_at?: string;
}

/**
 * Complete processing job
 */
export interface Job {
  /** Unique job identifier */
  id: string;
  /** Current job status */
  status: JobStatus;
  /** Overall progress percentage (0-100) */
  progress: number;
  /** Profile ID being used */
  profile_id: string;
  /** Audio file path */
  audio_file: string;
  /** Job creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
  /** Generated shot sequence */
  shot_sequence?: ShotSequence;
  /** Emotion analysis results */
  emotion_analysis?: EmotionAnalysis;
  /** Current processing stages */
  stages: ProcessingStage[];
  /** Job priority */
  priority?: number;
  /** Estimated completion time */
  estimated_completion?: string;
  /** Error information if failed */
  error?: ErrorDetail;
  /** Job metadata */
  metadata?: Record<string, any>;
}

/**
 * Job creation request
 */
export interface CreateJobRequest {
  /** Profile ID to use */
  profile_id: string;
  /** Audio file path or upload */
  audio_file: string | File;
  /** Optional job name */
  job_name?: string;
  /** Processing options */
  options?: JobOptions;
}

/**
 * Job processing options
 */
export interface JobOptions {
  /** Whether to generate shot sequence */
  generate_shots?: boolean;
  /** Whether to perform emotion analysis */
  analyze_emotions?: boolean;
  /** Custom cinematography settings */
  cinematography?: CinematographyOverride[];
  /** Output format preferences */
  output_format?: 'video' | 'image_sequence' | 'data_only';
  /** Quality settings */
  quality?: 'low' | 'medium' | 'high' | 'ultra';
}

// ============================================================================
// PROFILE TYPES
// ============================================================================

/**
 * Profile validation settings
 */
export interface ProfileValidation {
  /** Strict validation mode */
  strict_mode: boolean;
  /** Allow missing emotions */
  allow_missing_emotions: boolean;
  /** Allow missing angles */
  allow_missing_angles: boolean;
  /** Require base images */
  require_base_images: boolean;
}

/**
 * Asset specifications for a profile
 */
export interface AssetSpecifications {
  /** Viseme image format */
  viseme_format: string;
  /** Whether alpha channel is required */
  alpha_channel_required: boolean;
  /** Resolution by shot angle */
  resolution_by_angle: Record<ShotDistance, {
    width: number;
    height: number;
  }>;
  /** Color space */
  color_space: string;
  /** Bit depth */
  bit_depth: number;
}

/**
 * Character metadata
 */
export interface CharacterMetadata {
  /** Full character name */
  full_name: string;
  /** Character type */
  character_type: string;
  /** Art style */
  art_style: string;
  /** Artist information */
  artist: string;
  /** Additional notes */
  notes: string;
}

/**
 * Default profile settings
 */
export interface DefaultSettings {
  /** Default shot angle */
  default_angle: ShotDistance;
  /** Default emotion */
  default_emotion: string;
  /** Base intensity level */
  base_intensity: number;
}

/**
 * Complete profile configuration
 */
export interface ProfileConfig {
  /** Schema version */
  schema_version: string;
  /** Profile name */
  profile_name: string;
  /** Profile version */
  version: string;
  /** Creation date */
  created_date: string;
  /** Last modification date */
  last_modified: string;
  /** Character metadata */
  character_metadata: CharacterMetadata;
  /** Supported shot angles */
  supported_angles: ShotDistance[];
  /** Supported emotions */
  supported_emotions: {
    core: string[];
    compound: string[];
  };
  /** Default settings */
  default_settings: DefaultSettings;
  /** Asset specifications */
  asset_specifications: AssetSpecifications;
  /** Validation settings */
  validation: ProfileValidation;
}

/**
 * Profile structure analysis result
 */
export interface ProfileStructureAnalysis {
  /** Profile being analyzed */
  profile_id: string;
  /** Whether profile is valid */
  is_valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Missing emotions */
  missing_emotions: string[];
  /** Missing angles */
  missing_angles: ShotDistance[];
  /** Asset completeness percentage */
  completeness_percentage: number;
  /** Total assets count */
  total_assets: number;
  /** Valid assets count */
  valid_assets: number;
}

// ============================================================================
// WEBSOCKET EVENT TYPES
// ============================================================================

/**
 * Base WebSocket event interface
 */
export interface WebSocketEvent {
  /** Event type identifier */
  type: string;
  /** Event timestamp */
  timestamp: string;
  /** Associated job ID */
  job_id?: string;
  /** Event-specific data */
  data?: any;
}

/**
 * Connection established event
 */
export interface ConnectionEstablishedEvent extends WebSocketEvent {
  type: 'connection_established';
  /** Connection identifier */
  connection_id: string;
  /** Server capabilities */
  server_capabilities: {
    emotion_segment_events: boolean;
    shot_decision_events: boolean;
    processing_stage_events: boolean;
    tension_analysis_events: boolean;
    batch_processing_events: boolean;
  };
}

/**
 * Emotion segment processed event
 */
export interface EmotionSegmentEvent extends WebSocketEvent {
  type: 'emotion_segment_processed';
  /** Processed segment data */
  segment: EmotionSegment;
  /** Segment index in sequence */
  segment_index: number;
  /** Total segments expected */
  total_segments?: number;
}

/**
 * Shot decision made event
 */
export interface ShotDecisionEvent extends WebSocketEvent {
  type: 'shot_decision_made';
  /** Emotion influencing decision */
  emotion: string;
  /** Selected shot type */
  selected_shot: ShotDistance;
  /** Vertical angle */
  vertical_angle: CameraAngle;
  /** Decision confidence */
  confidence: number;
  /** AI reasoning */
  reasoning: string;
  /** Shot purpose */
  shot_purpose: ShotPurpose;
  /** Duration modifier */
  duration_modifier: number;
}

/**
 * Processing stage update event
 */
export interface ProcessingStageEvent extends WebSocketEvent {
  type: 'processing_stage_update';
  /** Stage name */
  stage: string;
  /** Progress percentage */
  progress: number;
  /** Estimated completion time */
  estimated_completion?: string;
  /** Stage status */
  status?: StageStatus;
}

/**
 * Tension analysis complete event
 */
export interface TensionAnalysisEvent extends WebSocketEvent {
  type: 'tension_analysis_complete';
  /** Overall tension level */
  tension_level: 'low' | 'medium' | 'high' | 'critical';
  /** Tension score (0-1) */
  tension_score: number;
  /** Narrative phase */
  narrative_phase: string;
  /** Dramatic moments */
  dramatic_moments: Array<{
    segment_index: number;
    tension_level: number;
    tension_type: string;
  }>;
}

/**
 * Processing complete event
 */
export interface ProcessingCompleteEvent extends WebSocketEvent {
  type: 'processing_complete';
  /** Final job status */
  final_status: JobStatus;
  /** Total processing time */
  total_processing_time: number;
  /** Output file paths */
  output_files: string[];
  /** Summary statistics */
  summary: {
    total_segments: number;
    total_shots: number;
    average_confidence: number;
  };
}

/**
 * Error occurred event
 */
export interface ErrorOccurredEvent extends WebSocketEvent {
  type: 'error_occurred';
  /** Error code */
  error_code: string;
  /** Error message */
  error_message: string;
  /** Error stage */
  error_stage?: string;
  /** Whether job can continue */
  recoverable: boolean;
}

/**
 * Batch job update event
 */
export interface BatchJobUpdateEvent extends WebSocketEvent {
  type: 'batch_job_update';
  /** Batch identifier */
  batch_id: string;
  /** Total jobs in batch */
  total_jobs: number;
  /** Completed jobs */
  completed_jobs: number;
  /** Failed jobs */
  failed_jobs: number;
  /** Batch progress */
  progress: number;
}

/**
 * Union type for all WebSocket event types
 */
export type WebSocketEventType = 
  | ConnectionEstablishedEvent
  | EmotionSegmentEvent
  | ShotDecisionEvent
  | ProcessingStageEvent
  | TensionAnalysisEvent
  | ProcessingCompleteEvent
  | ErrorOccurredEvent
  | BatchJobUpdateEvent;

// ============================================================================
// SYSTEM MONITORING TYPES
// ============================================================================

/**
 * System performance metrics
 */
export interface SystemPerformance {
  /** CPU usage percentage */
  cpu_usage: number;
  /** Memory usage in MB */
  memory_usage: number;
  /** Memory usage percentage */
  memory_usage_percent: number;
  /** Disk usage in GB */
  disk_usage: number;
  /** Disk usage percentage */
  disk_usage_percent: number;
  /** Active processing jobs */
  active_jobs: number;
  /** Queue length */
  queue_length: number;
  /** System load average */
  load_average: number[];
  /** Uptime in seconds */
  uptime: number;
}

/**
 * Health check response
 */
export interface HealthCheck {
  /** Overall system health */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Service statuses */
  services: Record<string, {
    status: 'up' | 'down' | 'degraded';
    response_time?: number;
    last_check: string;
  }>;
  /** System performance */
  performance: SystemPerformance;
  /** Active warnings */
  warnings: string[];
  /** Active errors */
  errors: string[];
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * User interface preferences
 */
export interface UIPreferences {
  /** Preview mode selection */
  previewMode: 'storyboard' | 'timeline' | 'detailed';
  /** Selected segment indices */
  selectedSegments: number[];
  /** Show confidence indicators */
  showConfidence: boolean;
  /** Show tension analysis */
  showTension: boolean;
  /** Grid column count */
  gridColumns: number;
  /** Theme preference */
  theme: 'light' | 'dark' | 'auto';
  /** Language preference */
  language: string;
  /** Auto-save settings */
  autoSave: boolean;
  /** Notification preferences */
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
}

/**
 * Application state
 */
export interface AppState {
  /** Current user */
  user: User | null;
  /** Authentication status */
  isAuthenticated: boolean;
  /** Loading states */
  loading: {
    global: boolean;
    jobs: boolean;
    profiles: boolean;
  };
  /** Error states */
  errors: Record<string, string | null>;
  /** UI preferences */
  preferences: UIPreferences;
}

/**
 * User information
 */
export interface User {
  /** User ID */
  id: string;
  /** Username */
  username: string;
  /** Email address */
  email: string;
  /** User role */
  role: 'admin' | 'user' | 'viewer';
  /** Last login timestamp */
  last_login: string;
  /** Account creation date */
  created_at: string;
}

// ============================================================================
// TYPE GUARDS AND VALIDATION
// ============================================================================

/**
 * Type guard for API responses
 */
export function isAPIResponse(obj: any): obj is APIResponse {
  return obj && 
         typeof obj === 'object' && 
         typeof obj.success === 'boolean' && 
         typeof obj.metadata === 'object' &&
         typeof obj.metadata.timestamp === 'string' &&
         typeof obj.metadata.request_id === 'string';
}

/**
 * Type guard for error responses
 */
export function isErrorAPIResponse(obj: any): obj is APIResponse<never> {
  return isAPIResponse(obj) && 
         obj.success === false && 
         obj.error !== undefined;
}

/**
 * Type guard for successful responses
 */
export function isSuccessAPIResponse<T>(obj: any): obj is APIResponse<T> {
  return isAPIResponse(obj) && 
         obj.success === true;
}

/**
 * Type guard for WebSocket events
 */
export function isWebSocketEvent(obj: any): obj is WebSocketEvent {
  return obj && 
         typeof obj === 'object' && 
         typeof obj.type === 'string' && 
         typeof obj.timestamp === 'string';
}

/**
 * Type guard for emotion segments
 */
export function isEmotionSegment(obj: any): obj is EmotionSegment {
  return obj && 
         typeof obj === 'object' &&
         typeof obj.start_time === 'number' &&
         typeof obj.end_time === 'number' &&
         typeof obj.emotion === 'string' &&
         typeof obj.confidence === 'number' &&
         typeof obj.valence === 'number' &&
         typeof obj.arousal === 'number';
}

/**
 * Type guard for shot decisions
 */
export function isShotDecision(obj: any): obj is ShotDecision {
  return obj && 
         typeof obj === 'object' &&
         typeof obj.emotion === 'string' &&
         typeof obj.selected_shot === 'string' &&
         typeof obj.vertical_angle === 'string' &&
         typeof obj.confidence === 'number' &&
         typeof obj.reasoning === 'string';
}

/**
 * Validate and cast shot distance
 */
export function isValidShotDistance(value: string): value is ShotDistance {
  return ['ECU', 'CU', 'MCU', 'MS', 'MLS', 'LS'].includes(value);
}

/**
 * Validate and cast camera angle
 */
export function isValidCameraAngle(value: string): value is CameraAngle {
  return ['high_angle', 'eye_level', 'low_angle', 'dutch', 'slight_low', 'slight_high'].includes(value);
}

/**
 * Validate and cast job status
 */
export function isValidJobStatus(value: string): value is JobStatus {
  return ['pending', 'processing', 'completed', 'failed', 'cancelled', 'paused'].includes(value);
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Make all properties of T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Pick properties from T that match type U
 */
export type PropertiesOfType<T, U> = Pick<T, { [K in keyof T]: T[K] extends U ? K : never }[keyof T]>;

/**
 * Extract array element type
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : never;

/**
 * Create a type with required fields from T
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * API request wrapper with loading and error states
 */
export interface APIRequestState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

/**
 * Generic API client interface
 */
export interface APIClient {
  /** GET request */
  get<T>(endpoint: string, params?: Record<string, any>): Promise<APIResponse<T>>;
  /** POST request */
  post<T>(endpoint: string, data?: any): Promise<APIResponse<T>>;
  /** PUT request */
  put<T>(endpoint: string, data?: any): Promise<APIResponse<T>>;
  /** DELETE request */
  delete<T>(endpoint: string): Promise<APIResponse<T>>;
  /** Upload file */
  upload<T>(endpoint: string, file: File, data?: Record<string, any>): Promise<APIResponse<T>>;
}