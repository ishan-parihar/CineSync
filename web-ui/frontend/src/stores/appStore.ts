import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Import types
import type { 
  Job, 
  EmotionAnalysis, 
  CinematographyConfig, 
  UIPreferences,
  WebSocketEvent,
  EmotionSegmentEvent,
  ShotDecisionEvent,
  ProcessingStageEvent,
  TensionAnalysisEvent
} from '../types';

interface AppStore {
  // Profile management
  profiles: any[];
  activeProfile: any | null;
  
  // Processing state
  activeJobs: Job[];
  processingQueue: Job[];
  currentJob: Job | null;
  
  // Analysis data
  emotionAnalysis: EmotionAnalysis | null;
  shotSequence: any[];
  cinematographyConfig: CinematographyConfig | null;
  
  // Real-time events
  recentEvents: WebSocketEvent[];
  processingStages: Record<string, any>;
  
  // UI state
  selectedSegments: number[];
  previewMode: 'storyboard' | 'timeline' | 'detailed';
  showConfidence: boolean;
  showTension: boolean;
  gridColumns: number;
  
  // WebSocket connection
  isConnected: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'destroyed';
  connectionStats: any | null;
  lastWebSocketError: string | null;
  
  // Actions
  setProfiles: (profiles: any[]) => void;
  setActiveProfile: (profile: any | null) => void;
  setActiveJobs: (jobs: Job[]) => void;
  setCurrentJob: (job: Job | null) => void;
  setEmotionAnalysis: (analysis: EmotionAnalysis | null) => void;
  setShotSequence: (sequence: any[]) => void;
  setCinematographyConfig: (config: CinematographyConfig | null) => void;
  addWebSocketEvent: (event: WebSocketEvent) => void;
  updateProcessingStage: (stage: string, data: any) => void;
  setSelectedSegments: (segments: number[]) => void;
  setPreviewMode: (mode: 'storyboard' | 'timeline' | 'detailed') => void;
  setShowConfidence: (show: boolean) => void;
  setShowTension: (show: boolean) => void;
  setGridColumns: (columns: number) => void;
  setConnected: (connected: boolean) => void;
  setConnectionState: (state: string) => void;
  setConnectionStats: (stats: any) => void;
  setLastWebSocketError: (error: string | null) => void;
  
  // WebSocket event handlers
  handleEmotionSegmentEvent: (event: EmotionSegmentEvent) => void;
  handleShotDecisionEvent: (event: ShotDecisionEvent) => void;
  handleProcessingStageEvent: (event: ProcessingStageEvent) => void;
  handleTensionAnalysisEvent: (event: TensionAnalysisEvent) => void;
  
  // Utility actions
  clearRecentEvents: () => void;
  resetProcessingState: () => void;
}

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    profiles: [],
    activeProfile: null,
    activeJobs: [],
    processingQueue: [],
    currentJob: null,
    emotionAnalysis: null,
    shotSequence: [],
    cinematographyConfig: null,
    recentEvents: [],
    processingStages: {},
    selectedSegments: [],
    previewMode: 'storyboard',
    showConfidence: true,
    showTension: true,
    gridColumns: 3,
    isConnected: false,
    connectionState: 'disconnected',
    connectionStats: null,
    lastWebSocketError: null,
    
    // Basic setters
    setProfiles: (profiles) => set({ profiles }),
    setActiveProfile: (profile) => set({ activeProfile: profile }),
    setActiveJobs: (jobs) => set({ activeJobs: jobs }),
    setCurrentJob: (job) => set({ currentJob: job }),
    setEmotionAnalysis: (analysis) => set({ emotionAnalysis: analysis }),
    setShotSequence: (sequence) => set({ shotSequence: sequence }),
    setCinematographyConfig: (config) => set({ cinematographyConfig: config }),
    addWebSocketEvent: (event) => set((state) => ({ 
      recentEvents: [...state.recentEvents.slice(-99), event] // Keep last 100 events
    })),
    updateProcessingStage: (stage, data) => set((state) => ({
      processingStages: { ...state.processingStages, [stage]: data }
    })),
    setSelectedSegments: (segments) => set({ selectedSegments: segments }),
    setPreviewMode: (mode) => set({ previewMode: mode }),
    setShowConfidence: (show) => set({ showConfidence: show }),
    setShowTension: (show) => set({ showTension: show }),
    setGridColumns: (columns) => set({ gridColumns: columns }),
    setConnected: (connected) => set({ isConnected: connected }),
    setConnectionState: (state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'destroyed') => set({ connectionState: state }),
    setConnectionStats: (stats) => set({ connectionStats: stats }),
    setLastWebSocketError: (error) => set({ lastWebSocketError: error }),
    
    // WebSocket event handlers
    handleEmotionSegmentEvent: (event) => {
      const state = get();
      const newSegment = event.segment;
      
      // Update emotion analysis with new segment
      const currentAnalysis = state.emotionAnalysis || { segments: [], overall_emotion: '', overall_confidence: 0, duration: 0 };
      const updatedSegments = [...currentAnalysis.segments, newSegment];
      
      set({
        emotionAnalysis: {
          ...currentAnalysis,
          segments: updatedSegments,
          duration: Math.max(...updatedSegments.map(s => s.end_time))
        }
      });
      
      // Add to recent events
      get().addWebSocketEvent(event);
    },
    
    handleShotDecisionEvent: (event) => {
      const state = get();
      const shotDecision = {
        emotion: event.emotion,
        selected_shot: event.selected_shot,
        vertical_angle: event.vertical_angle,
        horizontal_angle: 'eye_level', // Default if not provided
        confidence: event.confidence,
        reasoning: event.reasoning,
        start_time: 0, // Will be updated based on emotion timing
        end_time: 0
      };
      
      set({
        shotSequence: [...state.shotSequence, shotDecision]
      });
      
      get().addWebSocketEvent(event);
    },
    
    handleProcessingStageEvent: (event) => {
      get().updateProcessingStage(event.stage, {
        progress: event.progress,
        estimated_completion: event.estimated_completion,
        status: event.progress === 100 ? 'completed' : 'in_progress'
      });
      
      get().addWebSocketEvent(event);
    },
    
    handleTensionAnalysisEvent: (event) => {
      // Store tension data for visualization
      get().updateProcessingStage('tension_analysis', {
        data: {
          tension_level: event.tension_level,
          tension_score: event.tension_score,
          narrative_phase: event.narrative_phase,
          dramatic_moments: event.dramatic_moments
        },
        status: 'completed'
      });
      
      get().addWebSocketEvent(event);
    },
    
    // Utility actions
    clearRecentEvents: () => set({ recentEvents: [] }),
    resetProcessingState: () => set({
      currentJob: null,
      emotionAnalysis: null,
      shotSequence: [],
      processingStages: {},
      selectedSegments: []
    })
  }))
);

// Selectors for commonly used combinations
export const useProcessingState = () => useAppStore((state) => ({
  currentJob: state.currentJob,
  emotionAnalysis: state.emotionAnalysis,
  shotSequence: state.shotSequence,
  processingStages: state.processingStages,
  isConnected: state.isConnected
}));

export const useUIState = () => useAppStore((state) => ({
  previewMode: state.previewMode,
  selectedSegments: state.selectedSegments,
  showConfidence: state.showConfidence,
  showTension: state.showTension,
  gridColumns: state.gridColumns
}));

export const useWebSocketState = () => useAppStore((state) => ({
  recentEvents: state.recentEvents,
  isConnected: state.isConnected,
  connectionState: state.connectionState,
  connectionStats: state.connectionStats,
  lastWebSocketError: state.lastWebSocketError
}));