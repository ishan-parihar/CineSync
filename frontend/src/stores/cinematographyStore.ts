/**
 * Cinematography Store - Domain-specific store for cinematographic decisions and configuration
 * Handles shot sequences, camera decisions, emotion mappings, and visual configurations
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, devtools } from 'zustand/middleware';
import type { 
  CinematographyConfig,
  ShotDecision,
  ShotSequence,
  ShotDistance,
  CameraAngle,
  ShotPurpose,
  EmotionSegment,
  CinematographyOverride,
  ShotTransition,
  EmotionAnalysis,
  WebSocketEvent,
  ShotDecisionEvent,
  TensionAnalysisEvent
} from '../types';

// Store state interface
interface CinematographyState {
  // Core data
  cinematographyConfig: CinematographyConfig | null;
  shotSequence: ShotSequence | null;
  shotDecisions: ShotDecision[];
  
  // Analysis data
  emotionAnalysis: EmotionAnalysis | null;
  tensionData: {
    tension_level: 'low' | 'medium' | 'high' | 'critical';
    tension_score: number;
    narrative_phase: string;
    dramatic_moments: Array<{
      segment_index: number;
      tension_level: number;
      tension_type: string;
    }>;
  } | null;
  
  // Configuration and overrides
  customOverrides: CinematographyOverride[];
  activeOverrides: CinematographyOverride[];
  presetStyles: Record<string, Partial<CinematographyConfig>>;
  
  // Real-time events
  recentDecisions: ShotDecisionEvent[];
  decisionHistory: ShotDecisionEvent[];
  
  // Loading states
  loading: {
    config: boolean;
    sequence: boolean;
    analysis: boolean;
    decisions: boolean;
    overrides: boolean;
  };
  
  // Error states
  errors: Record<string, string | null>;
  
  // UI state
  selectedSegmentIndex: number | null;
  selectedShotIndex: number | null;
  viewMode: 'timeline' | 'storyboard' | 'grid' | 'detailed';
  showConfidence: boolean;
  showTension: boolean;
  showReasoning: boolean;
  playbackEnabled: boolean;
  currentTime: number; // seconds
  
  // Editing state
  editingMode: boolean;
  editedShots: Record<number, Partial<ShotDecision>>;
  undoStack: Array<{
    type: 'edit' | 'add' | 'delete';
    shotIndex?: number;
    data: any;
    timestamp: number;
  }>;
  redoStack: Array<{
    type: 'edit' | 'add' | 'delete';
    shotIndex?: number;
    data: any;
    timestamp: number;
  }>;
  
  // Validation and suggestions
  validationErrors: Array<{
    shotIndex: number;
    error: string;
    severity: 'warning' | 'error';
  }>;
  suggestions: Array<{
    shotIndex: number;
    suggestion: string;
    type: 'improvement' | 'alternative';
  }>;
  
  // Performance metrics
  sequenceMetrics: {
    totalShots: number;
    averageShotDuration: number;
    shotTypeDistribution: Record<ShotDistance, number>;
    angleDistribution: Record<CameraAngle, number>;
    overallConfidence: number;
    grammarCompliance: number;
  };
  
  // Cache
  lastConfigUpdate: number | null;
  cacheExpiry: number; // 10 minutes
}

// Store actions interface
interface CinematographyActions {
  // Configuration management
  setCinematographyConfig: (config: CinematographyConfig) => void;
  updateConfig: (updates: Partial<CinematographyConfig>) => void;
  resetConfig: () => void;
  
  // Shot sequence management
  setShotSequence: (sequence: ShotSequence) => void;
  setShotDecisions: (decisions: ShotDecision[]) => void;
  addShotDecision: (decision: ShotDecision, index?: number) => void;
  updateShotDecision: (index: number, updates: Partial<ShotDecision>) => void;
  deleteShotDecision: (index: number) => void;
  reorderShotDecisions: (fromIndex: number, toIndex: number) => void;
  clearShotSequence: () => void;
  
  // Analysis data
  setEmotionAnalysis: (analysis: EmotionAnalysis) => void;
  setTensionData: (data: CinematographyState['tensionData']) => void;
  
  // Override management
  addOverride: (override: CinematographyOverride) => void;
  removeOverride: (overrideId: string) => void;
  applyOverride: (override: CinematographyOverride) => void;
  clearOverrides: () => void;
  
  // Event handling
  addShotDecisionEvent: (event: ShotDecisionEvent) => void;
  handleTensionAnalysisEvent: (event: TensionAnalysisEvent) => void;
  clearEvents: () => void;
  
  // Loading and error actions
  setLoading: (key: keyof CinematographyState['loading'], value: boolean) => void;
  setError: (key: string, error: string | null) => void;
  clearErrors: () => void;
  
  // UI actions
  setSelectedSegment: (index: number | null) => void;
  setSelectedShot: (index: number | null) => void;
  setViewMode: (mode: CinematographyState['viewMode']) => void;
  setShowConfidence: (show: boolean) => void;
  setShowTension: (show: boolean) => void;
  setShowReasoning: (show: boolean) => void;
  setPlaybackEnabled: (enabled: boolean) => void;
  setCurrentTime: (time: number) => void;
  
  // Editing actions
  setEditingMode: (enabled: boolean) => void;
  editShot: (index: number, updates: Partial<ShotDecision>) => void;
  saveEdits: () => void;
  discardEdits: () => void;
  undo: () => void;
  redo: () => void;
  clearUndoRedoStacks: () => void;
  
  // Validation and suggestions
  validateSequence: () => void;
  generateSuggestions: () => void;
  clearValidationErrors: () => void;
  clearSuggestions: () => void;
  
  // Preset management
  savePreset: (name: string, config: Partial<CinematographyConfig>) => void;
  loadPreset: (name: string) => void;
  deletePreset: (name: string) => void;
  
  // Import/Export
  exportSequence: () => string;
  importSequence: (data: string) => void;
  exportConfig: () => string;
  importConfig: (data: string) => void;
  
  // Utility actions
  resetStore: () => void;
  calculateMetrics: () => void;
  optimizeSequence: () => void;
}

// Computed selectors
interface CinematographySelectors {
  // Derived data
  currentShot: ShotDecision | null;
  selectedShot: ShotDecision | null;
  selectedSegment: EmotionSegment | null;
  
  // Analysis results
  hasEmotionData: boolean;
  hasShotSequence: boolean;
  sequenceProgress: number;
  
  // Editing status
  hasUnsavedChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isValidSequence: boolean;
  
  // Status checks
  isLoading: boolean;
  hasErrors: boolean;
  hasValidationErrors: boolean;
  hasSuggestions: boolean;
  
  // Cache status
  isConfigStale: boolean;
}

// Initial state
const initialState: CinematographyState = {
  cinematographyConfig: null,
  shotSequence: null,
  shotDecisions: [],
  
  emotionAnalysis: null,
  tensionData: null,
  
  customOverrides: [],
  activeOverrides: [],
  presetStyles: {},
  
  recentDecisions: [],
  decisionHistory: [],
  
  loading: {
    config: false,
    sequence: false,
    analysis: false,
    decisions: false,
    overrides: false,
  },
  
  errors: {},
  
  selectedSegmentIndex: null,
  selectedShotIndex: null,
  viewMode: 'timeline',
  showConfidence: true,
  showTension: true,
  showReasoning: false,
  playbackEnabled: false,
  currentTime: 0,
  
  editingMode: false,
  editedShots: {},
  undoStack: [],
  redoStack: [],
  
  validationErrors: [],
  suggestions: [],
  
  sequenceMetrics: {
    totalShots: 0,
    averageShotDuration: 0,
    shotTypeDistribution: {} as Record<ShotDistance, number>,
    angleDistribution: {} as Record<CameraAngle, number>,
    overallConfidence: 0,
    grammarCompliance: 0,
  },
  
  lastConfigUpdate: null,
  cacheExpiry: 10 * 60 * 1000, // 10 minutes
};

// Create the store
export const useCinematographyStore = create<CinematographyState & CinematographyActions & CinematographySelectors>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        ...initialState,
        
        // Configuration management
        setCinematographyConfig: (config) => {
          set({
            cinematographyConfig: config,
            lastConfigUpdate: Date.now(),
            errors: { ...get().errors, config: null }
          });
        },
        
        updateConfig: (updates) => {
          set((state) => {
            if (!state.cinematographyConfig) return state;
            
            return {
              cinematographyConfig: { ...state.cinematographyConfig, ...updates },
              lastConfigUpdate: Date.now()
            };
          });
        },
        
        resetConfig: () => {
          set({
            cinematographyConfig: null,
            lastConfigUpdate: null
          });
        },
        
        // Shot sequence management
        setShotSequence: (sequence) => {
          set({
            shotSequence: sequence,
            shotDecisions: sequence.shots,
            errors: { ...get().errors, sequence: null }
          });
          
          get().calculateMetrics();
        },
        
        setShotDecisions: (decisions) => {
          const sequence: ShotSequence = {
            shots: decisions,
            overall_confidence: decisions.reduce((sum, shot) => sum + shot.confidence, 0) / decisions.length,
            total_duration: decisions.reduce((sum, shot) => sum + (shot.end_time - shot.start_time), 0),
            style: get().cinematographyConfig ? 'custom' : 'default',
            grammar_compliance: 0 // Would be calculated
          };
          
          set({
            shotDecisions: decisions,
            shotSequence: sequence
          });
          
          get().calculateMetrics();
        },
        
        addShotDecision: (decision, index) => {
          set((state) => {
            const newDecisions = [...state.shotDecisions];
            if (index !== undefined && index >= 0 && index <= newDecisions.length) {
              newDecisions.splice(index, 0, decision);
            } else {
              newDecisions.push(decision);
            }
            
            // Add to undo stack
            const undoAction = {
              type: 'add' as const,
              shotIndex: index ?? newDecisions.length - 1,
              data: decision,
              timestamp: Date.now()
            };
            
            return {
              shotDecisions: newDecisions,
              undoStack: [...state.undoStack, undoAction],
              redoStack: []
            };
          });
          
          get().calculateMetrics();
        },
        
        updateShotDecision: (index, updates) => {
          const currentShot = get().shotDecisions[index];
          if (!currentShot) return;
          
          set((state) => {
            const newDecisions = [...state.shotDecisions];
            const oldShot = { ...newDecisions[index] };
            newDecisions[index] = { ...newDecisions[index], ...updates };
            
            // Add to undo stack
            const undoAction = {
              type: 'edit' as const,
              shotIndex: index,
              data: oldShot,
              timestamp: Date.now()
            };
            
            return {
              shotDecisions: newDecisions,
              editedShots: { ...state.editedShots, [index]: updates },
              undoStack: [...state.undoStack, undoAction],
              redoStack: []
            };
          });
          
          get().calculateMetrics();
        },
        
        deleteShotDecision: (index) => {
          const shotToDelete = get().shotDecisions[index];
          if (!shotToDelete) return;
          
          set((state) => {
            const newDecisions = state.shotDecisions.filter((_, i) => i !== index);
            
            // Add to undo stack
            const undoAction = {
              type: 'delete' as const,
              shotIndex: index,
              data: shotToDelete,
              timestamp: Date.now()
            };
            
            return {
              shotDecisions: newDecisions,
              undoStack: [...state.undoStack, undoAction],
              redoStack: [],
              selectedShotIndex: state.selectedShotIndex === index ? null : state.selectedShotIndex
            };
          });
          
          get().calculateMetrics();
        },
        
        reorderShotDecisions: (fromIndex, toIndex) => {
          set((state) => {
            const newDecisions = [...state.shotDecisions];
            const [movedShot] = newDecisions.splice(fromIndex, 1);
            newDecisions.splice(toIndex, 0, movedShot);
            
            // Add to undo stack
            const undoAction = {
              type: 'edit' as const,
              shotIndex: fromIndex,
              data: { fromIndex, toIndex },
              timestamp: Date.now()
            };
            
            return {
              shotDecisions: newDecisions,
              undoStack: [...state.undoStack, undoAction],
              redoStack: []
            };
          });
        },
        
        clearShotSequence: () => {
          set({
            shotSequence: null,
            shotDecisions: [],
            selectedShotIndex: null
          });
          
          get().calculateMetrics();
        },
        
        // Analysis data
        setEmotionAnalysis: (analysis) => {
          set({
            emotionAnalysis: analysis,
            errors: { ...get().errors, analysis: null }
          });
        },
        
        setTensionData: (data) => {
          set({ tensionData: data });
        },
        
        // Override management
        addOverride: (override) => {
          set((state) => ({
            customOverrides: [...state.customOverrides, { ...override, priority: override.priority || 1 }]
          }));
        },
        
        removeOverride: (overrideId) => {
          set((state) => ({
            customOverrides: state.customOverrides.filter(o => `${o.type}_${o.timestamp}` !== overrideId),
            activeOverrides: state.activeOverrides.filter(o => `${o.type}_${o.timestamp}` !== overrideId)
          }));
        },
        
        applyOverride: (override) => {
          set((state) => ({
            activeOverrides: [...state.activeOverrides, override]
          }));
        },
        
        clearOverrides: () => {
          set({
            customOverrides: [],
            activeOverrides: []
          });
        },
        
        // Event handling
        addShotDecisionEvent: (event) => {
          const shotDecision: ShotDecision = {
            emotion: event.emotion,
            selected_shot: event.selected_shot,
            vertical_angle: event.vertical_angle,
            horizontal_angle: 'eye_level',
            confidence: event.confidence,
            reasoning: event.reasoning,
            start_time: 0, // Would be calculated from emotion timing
            end_time: 0,
            shot_purpose: event.shot_purpose,
            duration_modifier: event.duration_modifier,
          };
          
          set((state) => ({
            recentDecisions: [...state.recentDecisions.slice(-19), event], // Keep last 20
            decisionHistory: [...state.decisionHistory, event],
            shotDecisions: [...state.shotDecisions, shotDecision]
          }));
          
          get().calculateMetrics();
        },
        
        handleTensionAnalysisEvent: (event) => {
          get().setTensionData({
            tension_level: event.tension_level,
            tension_score: event.tension_score,
            narrative_phase: event.narrative_phase,
            dramatic_moments: event.dramatic_moments
          });
        },
        
        clearEvents: () => {
          set({
            recentDecisions: [],
            decisionHistory: []
          });
        },
        
        // Loading and error actions
        setLoading: (key, value) => {
          set((state) => ({
            loading: { ...state.loading, [key]: value }
          }));
        },
        
        setError: (key, error) => {
          set((state) => ({
            errors: { ...state.errors, [key]: error }
          }));
        },
        
        clearErrors: () => {
          set({ errors: {} });
        },
        
        // UI actions
        setSelectedSegment: (index) => {
          set({ selectedSegmentIndex: index });
        },
        
        setSelectedShot: (index) => {
          set({ selectedShotIndex: index });
        },
        
        setViewMode: (mode) => {
          set({ viewMode: mode });
        },
        
        setShowConfidence: (show) => {
          set({ showConfidence: show });
        },
        
        setShowTension: (show) => {
          set({ showTension: show });
        },
        
        setShowReasoning: (show) => {
          set({ showReasoning: show });
        },
        
        setPlaybackEnabled: (enabled) => {
          set({ playbackEnabled: enabled });
        },
        
        setCurrentTime: (time) => {
          set({ currentTime: time });
          
          // Auto-select shot based on current time
          const currentShot = get().shotDecisions.find(shot => 
            time >= shot.start_time && time <= shot.end_time
          );
          
          if (currentShot) {
            const shotIndex = get().shotDecisions.indexOf(currentShot);
            get().setSelectedShot(shotIndex);
          }
        },
        
        // Editing actions
        setEditingMode: (enabled) => {
          set({ editingMode: enabled });
          
          if (!enabled) {
            get().discardEdits();
          }
        },
        
        editShot: (index, updates) => {
          set((state) => ({
            editedShots: { ...state.editedShots, [index]: updates }
          }));
        },
        
        saveEdits: () => {
          const state = get();
          const editedIndices = Object.keys(state.editedShots);
          
          if (editedIndices.length === 0) return;
          
          set((prevState) => {
            const newDecisions = [...prevState.shotDecisions];
            const undoActions: any[] = [];
            
            editedIndices.forEach(index => {
              const idx = parseInt(index);
              const oldShot = { ...newDecisions[idx] };
              newDecisions[idx] = { ...newDecisions[idx], ...prevState.editedShots[idx] };
              
              undoActions.push({
                type: 'edit' as const,
                shotIndex: idx,
                data: oldShot,
                timestamp: Date.now()
              });
            });
            
            return {
              shotDecisions: newDecisions,
              editedShots: {},
              undoStack: [...prevState.undoStack, ...undoActions],
              redoStack: []
            };
          });
          
          get().calculateMetrics();
        },
        
        discardEdits: () => {
          set({ editedShots: {} });
        },
        
        undo: () => {
          const state = get();
          const lastAction = state.undoStack[state.undoStack.length - 1];
          
          if (!lastAction) return;
          
          set((prevState) => {
            const newUndoStack = [...prevState.undoStack];
            const action = newUndoStack.pop()!;
            const newRedoStack = [...prevState.redoStack, action];
            let newDecisions = [...prevState.shotDecisions];
            
            switch (action.type) {
              case 'add':
                newDecisions.splice(action.shotIndex!, 1);
                break;
              case 'delete':
                newDecisions.splice(action.shotIndex!, 0, action.data);
                break;
              case 'edit':
                if (action.data.fromIndex !== undefined) {
                  // Reorder operation
                  const [movedShot] = newDecisions.splice(action.shotIndex!, 1);
                  newDecisions.splice(action.data.fromIndex, 0, movedShot);
                } else {
                  // Regular edit
                  newDecisions[action.shotIndex!] = action.data;
                }
                break;
            }
            
            return {
              shotDecisions: newDecisions,
              undoStack: newUndoStack,
              redoStack: newRedoStack
            };
          });
          
          get().calculateMetrics();
        },
        
        redo: () => {
          const state = get();
          const nextAction = state.redoStack[state.redoStack.length - 1];
          
          if (!nextAction) return;
          
          set((prevState) => {
            const newRedoStack = [...prevState.redoStack];
            const action = newRedoStack.pop()!;
            const newUndoStack = [...prevState.undoStack, action];
            let newDecisions = [...prevState.shotDecisions];
            
            // Re-apply the action (simplified for this example)
            switch (action.type) {
              case 'add':
                newDecisions.splice(action.shotIndex!, 0, action.data);
                break;
              case 'delete':
                newDecisions.splice(action.shotIndex!, 1);
                break;
              // Edit cases would need more complex handling
            }
            
            return {
              shotDecisions: newDecisions,
              undoStack: newUndoStack,
              redoStack: newRedoStack
            };
          });
          
          get().calculateMetrics();
        },
        
        clearUndoRedoStacks: () => {
          set({
            undoStack: [],
            redoStack: []
          });
        },
        
        // Validation and suggestions
        validateSequence: () => {
          const state = get();
          const errors: any[] = [];
          
          state.shotDecisions.forEach((shot, index) => {
            // Check for missing required fields
            if (!shot.emotion) {
              errors.push({
                shotIndex: index,
                error: 'Missing emotion',
                severity: 'error' as const
              });
            }
            
            if (!shot.selected_shot) {
              errors.push({
                shotIndex: index,
                error: 'Missing shot type',
                severity: 'error' as const
              });
            }
            
            if (shot.confidence < 0.5) {
              errors.push({
                shotIndex: index,
                error: 'Low confidence shot',
                severity: 'warning' as const
              });
            }
            
            // Check for timing issues
            if (shot.start_time >= shot.end_time) {
              errors.push({
                shotIndex: index,
                error: 'Invalid shot duration',
                severity: 'error' as const
              });
            }
            
            // Check for gaps with previous shot
            if (index > 0) {
              const prevShot = state.shotDecisions[index - 1];
              if (prevShot.end_time < shot.start_time) {
                errors.push({
                  shotIndex: index,
                  error: 'Gap between shots',
                  severity: 'warning' as const
                });
              }
            }
          });
          
          set({ validationErrors: errors });
        },
        
        generateSuggestions: () => {
          const state = get();
          const suggestions: any[] = [];
          
          state.shotDecisions.forEach((shot, index) => {
            // Suggest alternative shots for low confidence decisions
            if (shot.confidence < 0.7) {
              suggestions.push({
                shotIndex: index,
                suggestion: 'Consider alternative shot type for higher confidence',
                type: 'alternative' as const
              });
            }
            
            // Suggest transitions between shots
            if (index > 0 && !shot.transition) {
              suggestions.push({
                shotIndex: index,
                suggestion: 'Add transition for smoother flow',
                type: 'improvement' as const
              });
            }
          });
          
          set({ suggestions });
        },
        
        clearValidationErrors: () => {
          set({ validationErrors: [] });
        },
        
        clearSuggestions: () => {
          set({ suggestions: [] });
        },
        
        // Preset management
        savePreset: (name, config) => {
          set((state) => ({
            presetStyles: { ...state.presetStyles, [name]: config }
          }));
        },
        
        loadPreset: (name) => {
          const state = get();
          const preset = state.presetStyles[name];
          
          if (preset && state.cinematographyConfig) {
            get().updateConfig(preset);
          }
        },
        
        deletePreset: (name) => {
          set((state) => {
            const newPresets = { ...state.presetStyles };
            delete newPresets[name];
            return { presetStyles: newPresets };
          });
        },
        
        // Import/Export
        exportSequence: () => {
          const state = get();
          return JSON.stringify({
            shotDecisions: state.shotDecisions,
            sequence: state.shotSequence,
            metadata: {
              exportedAt: new Date().toISOString(),
              version: '1.0.0'
            }
          }, null, 2);
        },
        
        importSequence: (data) => {
          try {
            const parsed = JSON.parse(data);
            
            if (parsed.shotDecisions && Array.isArray(parsed.shotDecisions)) {
              get().setShotDecisions(parsed.shotDecisions);
            }
            
            if (parsed.sequence) {
              set({ shotSequence: parsed.sequence });
            }
          } catch (error) {
            get().setError('import', 'Invalid sequence data format');
          }
        },
        
        exportConfig: () => {
          const state = get();
          return JSON.stringify({
            config: state.cinematographyConfig,
            overrides: state.customOverrides,
            presets: state.presetStyles,
            metadata: {
              exportedAt: new Date().toISOString(),
              version: '1.0.0'
            }
          }, null, 2);
        },
        
        importConfig: (data) => {
          try {
            const parsed = JSON.parse(data);
            
            if (parsed.config) {
              get().setCinematographyConfig(parsed.config);
            }
            
            if (parsed.overrides && Array.isArray(parsed.overrides)) {
              set({ customOverrides: parsed.overrides });
            }
            
            if (parsed.presets) {
              set({ presetStyles: parsed.presets });
            }
          } catch (error) {
            get().setError('import', 'Invalid config data format');
          }
        },
        
        // Utility actions
        resetStore: () => {
          set(initialState);
        },
        
        calculateMetrics: () => {
          const state = get();
          const shots = state.shotDecisions;
          
          if (shots.length === 0) {
            set({
              sequenceMetrics: {
                totalShots: 0,
                averageShotDuration: 0,
                shotTypeDistribution: {} as Record<ShotDistance, number>,
                angleDistribution: {} as Record<CameraAngle, number>,
                overallConfidence: 0,
                grammarCompliance: 0,
              }
            });
            return;
          }
          
          // Calculate shot type distribution
          const shotTypeDistribution = shots.reduce((acc, shot) => {
            acc[shot.selected_shot] = (acc[shot.selected_shot] || 0) + 1;
            return acc;
          }, {} as Record<ShotDistance, number>);
          
          // Calculate angle distribution
          const angleDistribution = shots.reduce((acc, shot) => {
            acc[shot.vertical_angle] = (acc[shot.vertical_angle] || 0) + 1;
            return acc;
          }, {} as Record<CameraAngle, number>);
          
          // Calculate average shot duration
          const totalDuration = shots.reduce((sum, shot) => 
            sum + (shot.end_time - shot.start_time), 0
          );
          const averageShotDuration = totalDuration / shots.length;
          
          // Calculate overall confidence
          const overallConfidence = shots.reduce((sum, shot) => sum + shot.confidence, 0) / shots.length;
          
          set({
            sequenceMetrics: {
              totalShots: shots.length,
              averageShotDuration,
              shotTypeDistribution,
              angleDistribution,
              overallConfidence,
              grammarCompliance: state.shotSequence?.grammar_compliance || 0,
            }
          });
        },
        
        optimizeSequence: () => {
          // This would implement optimization algorithms
          // For now, just generate suggestions
          get().generateSuggestions();
          get().validateSequence();
        },
        
        // Computed selectors
        get currentShot() {
          try {
            const state = get();
            if (!state || !state.currentTime || state.currentTime === 0) return null;
            const shotDecisions = state.shotDecisions || [];
            return shotDecisions.find(shot => 
              state.currentTime >= shot.start_time && state.currentTime <= shot.end_time
            ) || null;
          } catch {
            return null;
          }
        },
        
        get selectedShot() {
          try {
            const state = get();
            if (!state) return null;
            const shotDecisions = state.shotDecisions || [];
            return state.selectedShotIndex !== null ? shotDecisions[state.selectedShotIndex] : null;
          } catch {
            return null;
          }
        },
        
        get selectedSegment() {
          try {
            const state = get();
            if (!state) return null;
            return state.selectedSegmentIndex !== null && state.emotionAnalysis 
              ? state.emotionAnalysis.segments[state.selectedSegmentIndex] 
              : null;
          } catch {
            return null;
          }
        },
        
        get hasEmotionData() {
          try {
            const state = get();
            return !!(state && state.emotionAnalysis && state.emotionAnalysis.segments && state.emotionAnalysis.segments.length > 0);
          } catch {
            return false;
          }
        },
        
        get hasShotSequence() {
          try {
            const state = get();
            return !!(state && state.shotSequence && state.shotSequence.shots && state.shotSequence.shots.length > 0);
          } catch {
            return false;
          }
        },
        
        get sequenceProgress() {
          try {
            const state = get();
            if (!state) return 0;
            const shotSequence = state.shotSequence;
            const shotDecisions = state.shotDecisions || [];
            if (!shotSequence || !shotSequence.shots || shotSequence.shots.length === 0) return 0;
            return (shotDecisions.length / shotSequence.shots.length) * 100;
          } catch {
            return 0;
          }
        },
        
        get hasUnsavedChanges() {
          try {
            const state = get();
            if (!state) return false;
            const editedShots = state.editedShots || {};
            const undoStack = state.undoStack || [];
            return Object.keys(editedShots).length > 0 || undoStack.length > 0;
          } catch {
            return false;
          }
        },
        
        get canUndo() {
          try {
            const undoStack = get().undoStack || [];
            return undoStack.length > 0;
          } catch {
            return false;
          }
        },
        
        get canRedo() {
          try {
            const redoStack = get().redoStack || [];
            return redoStack.length > 0;
          } catch {
            return false;
          }
        },
        
        get isValidSequence() {
          try {
            const state = get();
            if (!state) return false;
            const validationErrors = state.validationErrors || [];
            return validationErrors.length === 0;
          } catch {
            return false;
          }
        },
        
        get isLoading() {
          try {
            const state = get();
            if (!state) return false;
            const loading = state.loading || {};
            return Object.values(loading).some(loading => loading);
          } catch {
            return false;
          }
        },
        
        get hasErrors() {
          try {
            const state = get();
            if (!state) return false;
            const errors = state.errors || {};
            return Object.values(errors).some(error => error !== null);
          } catch {
            return false;
          }
        },
        
        get hasValidationErrors() {
          try {
            const state = get();
            if (!state) return false;
            const validationErrors = state.validationErrors || [];
            return validationErrors.length > 0;
          } catch {
            return false;
          }
        },
        
        get hasSuggestions() {
          try {
            const state = get();
            if (!state) return false;
            const suggestions = state.suggestions || [];
            return suggestions.length > 0;
          } catch {
            return false;
          }
        },
        
        get isConfigStale() {
          try {
            const state = get();
            return state && state.lastConfigUpdate ? Date.now() - state.lastConfigUpdate > state.cacheExpiry : true;
          } catch {
            return true;
          }
        }
      })),
      {
        name: 'cinematography-store',
        partialize: (state) => ({
          // Only persist specific fields
          cinematographyConfig: state.cinematographyConfig,
          customOverrides: state.customOverrides,
          presetStyles: state.presetStyles,
          viewMode: state.viewMode,
          showConfidence: state.showConfidence,
          showTension: state.showTension,
          showReasoning: state.showReasoning,
          lastConfigUpdate: state.lastConfigUpdate,
        }),
      }
    ),
    {
      name: 'cinematography-store',
    }
  )
);

// Computed selectors
export const useCurrentShot = () => useCinematographyStore(state => {
  try {
    if (!state || state.currentTime === 0 || !state.shotDecisions) return null;
    return state.shotDecisions.find(shot => 
      state.currentTime >= (shot?.start_time || 0) && state.currentTime <= (shot?.end_time || 0)
    ) || null;
  } catch (error) {
    console.warn('Error in useCurrentShot selector:', error);
    return null;
  }
});

export const useSelectedShot = () => useCinematographyStore(state => {
  try {
    if (!state || state.selectedShotIndex === null || !state.shotDecisions) return null;
    return state.shotDecisions[state.selectedShotIndex] || null;
  } catch (error) {
    console.warn('Error in useSelectedShot selector:', error);
    return null;
  }
});

export const useSelectedSegment = () => useCinematographyStore(state => {
  try {
    if (!state || state.selectedSegmentIndex === null || !state.emotionAnalysis) return null;
    return state.emotionAnalysis.segments?.[state.selectedSegmentIndex] || null;
  } catch (error) {
    console.warn('Error in useSelectedSegment selector:', error);
    return null;
  }
});

export const useCinematographyStatus = () => useCinematographyStore(state => {
  try {
    if (!state) {
      return {
        hasEmotionData: false,
        hasShotSequence: false,
        sequenceProgress: 0,
        hasUnsavedChanges: false,
        canUndo: false,
        canRedo: false,
        isValidSequence: true,
        isLoading: false,
        hasErrors: false,
        hasValidationErrors: false,
        hasSuggestions: false,
        isConfigStale: true
      };
    }
    
    return {
      hasEmotionData: state.emotionAnalysis !== null,
      hasShotSequence: (state.shotDecisions?.length || 0) > 0,
      sequenceProgress: (state.shotDecisions?.length || 0) > 0 
        ? (state.currentTime / (state.shotDecisions[state.shotDecisions.length - 1]?.end_time || 1)) * 100
        : 0,
      hasUnsavedChanges: Object.keys(state.editedShots || {}).length > 0,
      canUndo: (state.undoStack?.length || 0) > 0,
      canRedo: (state.redoStack?.length || 0) > 0,
      isValidSequence: (state.validationErrors?.length || 0) === 0,
      isLoading: Object.values(state.loading || {}).some(loading => loading),
      hasErrors: Object.values(state.errors || {}).some(error => error !== null),
      hasValidationErrors: (state.validationErrors?.length || 0) > 0,
      hasSuggestions: (state.suggestions?.length || 0) > 0,
      isConfigStale: state.lastConfigUpdate 
        ? Date.now() - state.lastConfigUpdate > (state.cacheExpiry || 300000)
        : true,
    };
  } catch (error) {
    console.warn('Error in useCinematographyStatus selector:', error);
    return {
      hasEmotionData: false,
      hasShotSequence: false,
      sequenceProgress: 0,
      hasUnsavedChanges: false,
      canUndo: false,
      canRedo: false,
      isValidSequence: true,
      isLoading: false,
      hasErrors: false,
      hasValidationErrors: false,
      hasSuggestions: false,
      isConfigStale: true
    };
  }
});

// Export the main store hook
export default useCinematographyStore;