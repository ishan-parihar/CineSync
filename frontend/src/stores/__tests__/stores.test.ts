/**
 * Comprehensive test suite for the new store architecture
 * Demonstrates testing patterns for domain-specific stores and orchestration
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Import all stores
import { 
  useProfilesStore,
  useProcessingStore,
  useCinematographyStore,
  useSystemStore,
  useUIStore,
  useStoreOrchestration,
  storeEventBus
} from '../stores';

// Import selectors
import {
  useActiveProfile,
  useValidProfiles,
  useProfileStats
} from '../stores/profilesStore';

// Import types
import type { 
  ProfileConfig, 
  Job, 
  ShotDecision, 
  EmotionAnalysis,
  WebSocketEvent 
} from '../types';

// Mock data
const mockProfile: ProfileConfig = {
  schema_version: '1.0.0',
  profile_name: 'test_profile',
  version: '1.0.0',
  created_date: '2024-01-01T00:00:00Z',
  last_modified: '2024-01-01T00:00:00Z',
  character_metadata: {
    full_name: 'Test Character',
    character_type: 'human',
    art_style: 'realistic',
    artist: 'Test Artist',
    notes: 'Test profile for unit testing'
  },
  supported_angles: ['CU', 'MS', 'LS'],
  supported_emotions: {
    core: ['happy', 'sad', 'angry'],
    compound: ['happily_sad', 'angrily_happy']
  },
  default_settings: {
    default_angle: 'CU',
    default_emotion: 'neutral',
    base_intensity: 0.5
  },
  asset_specifications: {
    viseme_format: 'png',
    alpha_channel_required: true,
    resolution_by_angle: {
      CU: { width: 512, height: 512 },
      MS: { width: 256, height: 256 },
      LS: { width: 128, height: 128 }
    },
    color_space: 'sRGB',
    bit_depth: 8
  },
  validation: {
    strict_mode: false,
    allow_missing_emotions: true,
    allow_missing_angles: true,
    require_base_images: false
  }
};

const mockJob: Job = {
  id: 'test-job-1',
  status: 'pending',
  progress: 0,
  profile_id: 'test_profile',
  audio_file: 'test.mp3',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  stages: []
};

const mockEmotionAnalysis: EmotionAnalysis = {
  segments: [
    {
      start_time: 0,
      end_time: 2,
      emotion: 'happy',
      confidence: 0.9,
      valence: 0.8,
      arousal: 0.7
    }
  ],
  overall_emotion: 'happy',
  overall_confidence: 0.9,
  duration: 2
};

const mockShotDecision: ShotDecision = {
  emotion: 'happy',
  selected_shot: 'CU',
  vertical_angle: 'eye_level',
  confidence: 0.85,
  reasoning: 'Happy emotion works well with close-up',
  start_time: 0,
  end_time: 2,
  shot_purpose: 'emotional',
  duration_modifier: 1.0
};

describe('Store Architecture Tests', () => {
  beforeEach(() => {
    // Reset all stores before each test
    useProfilesStore.getState().resetStore();
    useProcessingStore.getState().resetStore();
    useCinematographyStore.getState().resetStore();
    useSystemStore.getState().resetStore();
    useUIStore.getState().resetStore();
    storeEventBus.clearHistory();
  });

  // ============================================================================
  // PROFILES STORE TESTS
  // ============================================================================
  
  describe('ProfilesStore', () => {
    it('should add and retrieve profiles', () => {
      const { result } = renderHook(() => useProfilesStore());
      
      act(() => {
        result.current.addProfile(mockProfile);
      });
      
      expect(result.current.profiles).toContain(mockProfile);
      expect(result.current.profiles).toHaveLength(1);
    });

    it('should set active profile', () => {
      const { result } = renderHook(() => useProfilesStore());
      
      act(() => {
        result.current.addProfile(mockProfile);
        result.current.setActiveProfile('test_profile');
      });
      
      expect(result.current.activeProfileId).toBe('test_profile');
    });

    it('should update profile with optimistic updates', async () => {
      const { result } = renderHook(() => useProfilesStore());
      
      // Add profile first
      act(() => {
        result.current.addProfile(mockProfile);
      });
      
      // Perform optimistic update
      act(() => {
        result.current.updateProfile('test_profile', {
          character_metadata: {
            ...mockProfile.character_metadata,
            full_name: 'Updated Character'
          }
        });
      });
      
      const updatedProfile = result.current.profiles.find(p => p.profile_name === 'test_profile');
      expect(updatedProfile?.character_metadata.full_name).toBe('Updated Character');
    });

    it('should filter profiles correctly', () => {
      const { result } = renderHook(() => useProfilesStore());
      
      const anotherProfile = {
        ...mockProfile,
        profile_name: 'another_profile',
        supported_emotions: {
          core: ['angry', 'sad'],
          compound: []
        }
      };
      
      act(() => {
        result.current.addProfile(mockProfile);
        result.current.addProfile(anotherProfile);
        result.current.setFilterCriteria({ emotion: 'happy' });
      });
      
      // Use filtered profiles selector
      const { result: filterResult } = renderHook(() => useValidProfiles());
      expect(filterResult.current).toHaveLength(1);
      expect(filterResult.current[0].profile_name).toBe('test_profile');
    });

    it('should calculate profile statistics', () => {
      const { result } = renderHook(() => useProfileStats());
      
      expect(result.current.totalProfiles).toBe(0);
      expect(result.current.validProfileCount).toBe(0);
    });
  });

  // ============================================================================
  // PROCESSING STORE TESTS
  // ============================================================================
  
  describe('ProcessingStore', () => {
    it('should create and manage jobs', async () => {
      const { result } = renderHook(() => useProcessingStore());
      
      // Mock the API call
      const mockCreateJob = vi.fn().mockResolvedValue(mockJob);
      
      act(() => {
        result.current.addJob(mockJob);
      });
      
      expect(result.current.activeJobs).toHaveLength(0);
      expect(result.current.processingQueue).toHaveLength(1);
      expect(result.current.processingQueue[0]).toEqual(mockJob);
    });

    it('should handle job status updates', () => {
      const { result } = renderHook(() => useProcessingStore());
      
      act(() => {
        result.current.addJob(mockJob);
        result.current.updateJob(mockJob.id, { status: 'processing', progress: 50 });
      });
      
      const updatedJob = result.current.allJobs.find(j => j.id === mockJob.id);
      expect(updatedJob?.status).toBe('processing');
      expect(updatedJob?.progress).toBe(50);
    });

    it('should manage processing stages', () => {
      const { result } = renderHook(() => useProcessingStore());
      
      const stage = {
        name: 'emotion_analysis',
        progress: 75,
        status: 'in_progress' as const
      };
      
      act(() => {
        result.current.updateProcessingStage(mockJob.id, stage);
      });
      
      expect(result.current.processingStages[mockJob.id]).toBeDefined();
      expect(result.current.processingStages[mockJob.id]['emotion_analysis']).toEqual(stage);
    });

    it('should handle WebSocket events', () => {
      const { result } = renderHook(() => useProcessingStore());
      
      const event: any = {
        type: 'processing_stage_update',
        timestamp: '2024-01-01T00:00:00Z',
        job_id: mockJob.id,
        stage: 'emotion_analysis',
        progress: 100,
        status: 'completed'
      };
      
      act(() => {
        result.current.handleProcessingStageEvent(event);
      });
      
      expect(result.current.recentEvents).toHaveLength(1);
      expect(result.current.processingStages[mockJob.id]['emotion_analysis'].progress).toBe(100);
    });
  });

  // ============================================================================
  // CINEMATOGRAPHY STORE TESTS
  // ============================================================================
  
  describe('CinematographyStore', () => {
    it('should manage shot decisions', () => {
      const { result } = renderHook(() => useCinematographyStore());
      
      act(() => {
        result.current.addShotDecision(mockShotDecision);
      });
      
      expect(result.current.shotDecisions).toHaveLength(1);
      expect(result.current.shotDecisions[0]).toEqual(mockShotDecision);
    });

    it('should handle editing with undo/redo', () => {
      const { result } = renderHook(() => useCinematographyStore());
      
      act(() => {
        result.current.addShotDecision(mockShotDecision);
        result.current.setEditingMode(true);
        result.current.editShot(0, { confidence: 0.95 });
      });
      
      expect(result.current.editedShots[0]).toEqual({ confidence: 0.95 });
      expect(result.current.hasUnsavedChanges).toBe(true);
      
      // Test undo
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.shotDecisions[0].confidence).toBe(0.85);
    });

    it('should validate shot sequence', () => {
      const { result } = renderHook(() => useCinematographyStore());
      
      const invalidShot = {
        ...mockShotDecision,
        confidence: 0.3, // Low confidence
        start_time: 5,
        end_time: 3 // Invalid duration
      };
      
      act(() => {
        result.current.addShotDecision(mockShotDecision);
        result.current.addShotDecision(invalidShot);
        result.current.validateSequence();
      });
      
      expect(result.current.validationErrors.length).toBeGreaterThan(0);
      expect(result.current.isValidSequence).toBe(false);
    });

    it('should handle emotion analysis', () => {
      const { result } = renderHook(() => useCinematographyStore());
      
      act(() => {
        result.current.setEmotionAnalysis(mockEmotionAnalysis);
      });
      
      expect(result.current.emotionAnalysis).toEqual(mockEmotionAnalysis);
      expect(result.current.hasEmotionData).toBe(true);
    });
  });

  // ============================================================================
  // SYSTEM STORE TESTS
  // ============================================================================
  
  describe('SystemStore', () => {
    it('should manage health checks', () => {
      const { result } = renderHook(() => useSystemStore());
      
      const mockHealth = {
        status: 'healthy' as const,
        services: {
          api: { status: 'up' as const, response_time: 100, last_check: '2024-01-01T00:00:00Z' }
        },
        performance: {
          cpu_usage: 50,
          memory_usage: 1024,
          memory_usage_percent: 60,
          disk_usage: 100,
          disk_usage_percent: 70,
          active_jobs: 2,
          queue_length: 1,
          load_average: [1.5, 1.2, 1.0],
          uptime: 3600
        },
        warnings: [],
        errors: []
      };
      
      act(() => {
        result.current.setHealthCheck(mockHealth);
      });
      
      expect(result.current.healthCheck).toEqual(mockHealth);
      expect(result.current.isSystemHealthy).toBe(true);
    });

    it('should handle alerts and notifications', () => {
      const { result } = renderHook(() => useSystemStore());
      
      act(() => {
        result.current.addAlert({
          type: 'warning',
          message: 'High CPU usage',
          source: 'system-monitor',
          acknowledged: false
        });
      });
      
      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.hasActiveAlerts).toBe(true);
    });

    it('should track metrics history', () => {
      const { result } = renderHook(() => useSystemStore());
      
      act(() => {
        result.current.addMetricPoint('cpuUsage', 75);
        result.current.addMetricPoint('cpuUsage', 80);
        result.current.addMetricPoint('memoryUsage', 60);
      });
      
      expect(result.current.metrics.cpuUsage).toEqual([75, 80]);
      expect(result.current.metrics.memoryUsage).toEqual([60]);
    });
  });

  // ============================================================================
  // UI STORE TESTS
  // ============================================================================
  
  describe('UIStore', () => {
    it('should manage theme and preferences', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setTheme('dark');
        result.current.updatePreferences({
          previewMode: 'timeline',
          showConfidence: false
        });
      });
      
      expect(result.current.theme).toBe('dark');
      expect(result.current.preferences.previewMode).toBe('timeline');
      expect(result.current.preferences.showConfidence).toBe(false);
    });

    it('should handle modals and panels', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.openModal('settings');
        result.current.setPanelVisibility('profiles', false);
      });
      
      expect(result.current.modals.settings).toBe(true);
      expect(result.current.panels.profiles.visible).toBe(false);
      expect(result.current.hasActiveModals).toBe(true);
    });

    it('should manage notifications', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'Success',
          message: 'Operation completed successfully',
          autoHide: true
        });
      });
      
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.hasNotifications).toBe(true);
    });
  });

  // ============================================================================
  // STORE ORCHESTRATION TESTS
  // ============================================================================
  
  describe('StoreOrchestration', () => {
    it('should handle cross-store events', async () => {
      const { result } = renderHook(() => useStoreOrchestration());
      
      // Add profile first
      act(() => {
        result.current.stores.profiles.addProfile(mockProfile);
      });
      
      // Simulate profile selection event
      act(() => {
        storeEventBus.emit('profile:selected', { profileId: 'test_profile' });
      });
      
      // Verify cross-store effects
      await waitFor(() => {
        expect(result.current.stores.profiles.activeProfileId).toBe('test_profile');
      });
    });

    it('should create orchestrated job with full integration', async () => {
      const { result } = renderHook(() => useStoreOrchestration());
      
      // Setup profile
      act(() => {
        result.current.stores.profiles.addProfile(mockProfile);
      });
      
      // Create job with orchestration
      let createdJob: Job | undefined;
      await act(async () => {
        createdJob = await result.current.createOrchestratedJob('test_profile', 'test.mp3');
      });
      
      expect(createdJob).toBeDefined();
      expect(result.current.stores.processing.currentJobId).toBe(createdJob?.id);
      expect(result.current.stores.ui.currentRoute).toBe(`/processing/${createdJob?.id}`);
    });

    it('should synchronize stores', () => {
      const { result } = renderHook(() => useStoreOrchestration());
      
      // Add job to processing store
      act(() => {
        result.current.stores.processing.addJob(mockJob);
      });
      
      // Synchronize stores
      act(() => {
        result.current.synchronizeStores();
      });
      
      // Verify synchronization effects
      const metrics = result.current.stores.system.metrics;
      expect(metrics.activeJobs[metrics.activeJobs.length - 1]).toBe(1);
    });

    it('should provide application status', () => {
      const { result } = renderHook(() => useStoreOrchestration());
      
      const status = result.current.getApplicationStatus();
      
      expect(status).toHaveProperty('overall');
      expect(status).toHaveProperty('profiles');
      expect(status).toHaveProperty('processing');
      expect(status).toHaveProperty('cinematography');
      expect(status).toHaveProperty('system');
      expect(status).toHaveProperty('ui');
    });
  });

  // ============================================================================
  // EVENT BUS TESTS
  // ============================================================================
  
  describe('StoreEventBus', () => {
    it('should emit and receive events', () => {
      const mockCallback = vi.fn();
      
      const unsubscribe = storeEventBus.on('test:event', mockCallback);
      
      act(() => {
        storeEventBus.emit('test:event', { message: 'test data' });
      });
      
      expect(mockCallback).toHaveBeenCalledWith({ message: 'test data' });
      
      unsubscribe();
    });

    it('should maintain event history', () => {
      act(() => {
        storeEventBus.emit('test:event1', { data: 'test1' });
        storeEventBus.emit('test:event2', { data: 'test2' });
      });
      
      const history = storeEventBus.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe('test:event1');
      expect(history[1].type).toBe('test:event2');
    });

    it('should filter event history by type', () => {
      act(() => {
        storeEventBus.emit('test:event', { data: 'test' });
        storeEventBus.emit('other:event', { data: 'other' });
        storeEventBus.emit('test:event', { data: 'test2' });
      });
      
      const testHistory = storeEventBus.getHistory('test:event');
      expect(testHistory).toHaveLength(2);
      expect(testHistory.every(event => event.type === 'test:event')).toBe(true);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================
  
  describe('Integration Tests', () => {
    it('should handle complete workflow', async () => {
      const { result } = renderHook(() => useStoreOrchestration());
      
      // 1. Add profile
      act(() => {
        result.current.stores.profiles.addProfile(mockProfile);
        result.current.stores.profiles.setActiveProfile('test_profile');
      });
      
      // 2. Create job
      let job: Job | undefined;
      await act(async () => {
        job = await result.current.createOrchestratedJob('test_profile', 'test.mp3');
      });
      
      // 3. Add emotion analysis
      act(() => {
        result.current.stores.cinematography.setEmotionAnalysis(mockEmotionAnalysis);
      });
      
      // 4. Generate shot decisions
      act(() => {
        result.current.stores.cinematography.addShotDecision(mockShotDecision);
      });
      
      // 5. Verify complete state
      expect(result.current.stores.profiles.activeProfileId).toBe('test_profile');
      expect(result.current.stores.processing.currentJobId).toBe(job?.id);
      expect(result.current.stores.cinematography.emotionAnalysis).toEqual(mockEmotionAnalysis);
      expect(result.current.stores.cinematography.shotDecisions).toHaveLength(1);
      
      // 6. Verify application status reflects workflow
      const status = result.current.getApplicationStatus();
      expect(status.profiles.hasProfiles).toBe(true);
      expect(status.processing.hasActiveJobs).toBe(true);
      expect(status.cinematography.hasEmotionData).toBe(true);
    });

    it('should handle errors across stores', async () => {
      const { result } = renderHook(() => useStoreOrchestration());
      
      // Simulate system error
      const errorEvent: any = {
        type: 'error_occurred',
        timestamp: '2024-01-01T00:00:00Z',
        error_code: 'TEST_ERROR',
        error_message: 'Test error message',
        recoverable: false
      };
      
      act(() => {
        result.current.stores.system.handleErrorEvent(errorEvent);
      });
      
      // Verify error propagated to UI
      expect(result.current.stores.ui.notifications.length).toBeGreaterThan(0);
      expect(result.current.stores.system.alerts.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================
  
  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', () => {
      const { result } = renderHook(() => useProfilesStore());
      
      // Add many profiles
      const manyProfiles = Array.from({ length: 1000 }, (_, i) => ({
        ...mockProfile,
        profile_name: `profile_${i}`,
        created_date: new Date(Date.now() - i * 1000).toISOString()
      }));
      
      const startTime = performance.now();
      
      act(() => {
        manyProfiles.forEach(profile => result.current.addProfile(profile));
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(result.current.profiles).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should only re-render when subscribed state changes', () => {
      let renderCount = 0;
      
      const { result } = renderHook(() => {
        renderCount++;
        return useProfilesStore(state => state.profiles.length);
      });
      
      expect(result.current).toBe(0);
      expect(renderCount).toBe(1);
      
      // Update unrelated state - should not re-render
      act(() => {
        useProfilesStore.getState().setLoading('profiles', true);
      });
      
      expect(renderCount).toBe(1); // No additional render
      
      // Update related state - should re-render
      act(() => {
        result.current.addProfile(mockProfile);
      });
      
      expect(result.current).toBe(1);
      expect(renderCount).toBe(2);
    });
  });
});