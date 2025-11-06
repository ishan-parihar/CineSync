/**
 * State Management Integration Tests
 * Tests Zustand store interactions, persistence, and cross-component state sync
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { store } from '@/stores'
import { useAppStore, useProfilesStore, useProcessingStore, useSystemStore, useUIStore } from '@/stores'

describe('State Management Integration Tests', () => {
  beforeEach(() => {
    // Reset all stores
    store.dispatch({ type: 'RESET_STORE' })
  })

  describe('Cross-Store State Synchronization', () => {
    it('should sync profile selection across stores', async () => {
      const { profilesStore, processingStore } = store.getState()

      // Add profile
      act(() => {
        profilesStore.addProfile({
          id: 'test-profile-1',
          name: 'Test Character',
          emotions: ['happy', 'sad'],
          angles: ['CU', 'ECU'],
          createdAt: new Date().toISOString(),
        })
      })

      // Select profile for processing
      act(() => {
        profilesStore.selectProfile('test-profile-1')
        processingStore.setActiveProfile('test-profile-1')
      })

      expect(profilesStore.selectedProfileId).toBe('test-profile-1')
      expect(processingStore.activeProfileId).toBe('test-profile-1')

      // Verify UI store reflects selection
      const { uiStore } = store.getState()
      expect(uiStore.activeView).toBe('processing')
    })

    it('should handle processing state updates across components', async () => {
      const { processingStore, systemStore } = store.getState()

      // Start processing
      act(() => {
        processingStore.addToQueue({
          id: 'test-processing-1',
          file: new File(['test'], 'test.mp3'),
          status: 'pending',
          progress: 0,
        })
      })

      // Update processing status
      act(() => {
        processingStore.updateProcessingStatus('test-processing-1', {
          status: 'processing',
          progress: 50,
          stage: 'emotion_detection',
        })
      })

      // Verify system metrics update
      expect(systemStore.status.queue_size).toBe(1)
      expect(systemStore.status.active_processes).toBe(1)

      // Complete processing
      act(() => {
        processingStore.completeProcessing('test-processing-1')
      })

      expect(systemStore.status.queue_size).toBe(0)
      expect(systemStore.status.active_processes).toBe(0)
    })

    it('should maintain theme consistency across application', async () => {
      const { uiStore, appStore } = store.getState()

      // Change theme
      act(() => {
        uiStore.setTheme('dark')
        appStore.updateSettings({ theme: 'dark' })
      })

      expect(uiStore.theme).toBe('dark')
      expect(appStore.settings.theme).toBe('dark')

      // Verify theme persistence
      const persistedSettings = localStorage.getItem('app-settings')
      expect(persistedSettings).toContain('"theme":"dark"')
    })
  })

  describe('Store Persistence and Recovery', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('should persist and restore app settings', () => {
      const { appStore } = store.getState()

      // Update settings
      act(() => {
        appStore.updateSettings({
          theme: 'dark',
          language: 'fr',
          autoSave: true,
          notifications: false,
        })
      })

      // Create new store instance (simulate page refresh)
      const newStore = store.getState()
      expect(newStore.appStore.settings).toEqual({
        theme: 'dark',
        language: 'fr',
        autoSave: true,
        notifications: false,
      })
    })

    it('should persist and restore user preferences', () => {
      const { uiStore } = store.getState()

      // Update preferences
      act(() => {
        uiStore.setPreferences({
          sidebarCollapsed: true,
          compactMode: false,
          showAdvanced: true,
        })
      })

      // Verify persistence
      const persisted = localStorage.getItem('ui-preferences')
      expect(persisted).toContain('"sidebarCollapsed":true')

      // Restore on new instance
      const newStore = store.getState()
      expect(newStore.uiStore.preferences.sidebarCollapsed).toBe(true)
    })

    it('should handle corrupted persisted data gracefully', () => {
      // Inject corrupted data
      localStorage.setItem('app-settings', 'invalid json')

      const { appStore } = store.getState()

      // Should fallback to defaults
      expect(appStore.settings.theme).toBe('light')
      expect(appStore.settings.language).toBe('en')
    })

    it('should clear persisted data on logout', () => {
      const { appStore, profilesStore } = store.getState()

      // Add some data
      act(() => {
        appStore.updateSettings({ theme: 'dark' })
        profilesStore.addProfile({
          id: 'test-1',
          name: 'Test',
          emotions: [],
          angles: [],
          createdAt: new Date().toISOString(),
        })
      })

      // Logout
      act(() => {
        appStore.logout()
      })

      // Verify data is cleared
      expect(localStorage.getItem('app-settings')).toBeNull()
      expect(profilesStore.profiles).toHaveLength(0)
    })
  })

  describe('State Validation and Constraints', () => {
    it('should validate profile data', () => {
      const { profilesStore } = store.getState()

      // Try to add invalid profile
      expect(() => {
        act(() => {
          profilesStore.addProfile({
            id: '', // Invalid empty ID
            name: 'Test',
            emotions: ['invalid_emotion'],
            angles: [],
            createdAt: new Date().toISOString(),
          })
        })
      }).toThrow('Invalid profile data')

      // Valid profile should work
      expect(() => {
        act(() => {
          profilesStore.addProfile({
            id: 'valid-profile-1',
            name: 'Valid Character',
            emotions: ['happy', 'sad'],
            angles: ['CU', 'MS'],
            createdAt: new Date().toISOString(),
          })
        })
      }).not.toThrow()

      expect(profilesStore.profiles).toHaveLength(1)
    })

    it('should enforce processing queue limits', () => {
      const { processingStore } = store.getState()

      // Add items up to limit
      const maxQueueSize = 10
      for (let i = 0; i < maxQueueSize; i++) {
        act(() => {
          processingStore.addToQueue({
            id: `item-${i}`,
            file: new File(['test'], `test-${i}.mp3`),
            status: 'pending',
            progress: 0,
          })
        })
      }

      expect(processingStore.queue).toHaveLength(maxQueueSize)

      // Try to add beyond limit
      act(() => {
        processingStore.addToQueue({
          id: 'overflow-item',
          file: new File(['test'], 'overflow.mp3'),
          status: 'pending',
          progress: 0,
        })
      })

      // Should not exceed limit
      expect(processingStore.queue).toHaveLength(maxQueueSize)
    })

    it('should validate system status bounds', () => {
      const { systemStore } = store.getState()

      // Valid updates
      act(() => {
        systemStore.updateSystemStatus({
          cpu: 75,
          memory: 60,
          disk: 45,
        })
      })

      expect(systemStore.status.cpu).toBe(75)
      expect(systemStore.status.memory).toBe(60)

      // Invalid values should be clamped
      act(() => {
        systemStore.updateSystemStatus({
          cpu: 150, // Above 100
          memory: -10, // Below 0
          disk: 50,
        })
      })

      expect(systemStore.status.cpu).toBe(100)
      expect(systemStore.status.memory).toBe(0)
    })
  })

  describe('Performance Optimization', () => {
    it('should batch rapid state updates', async () => {
      const { processingStore } = store.getState()

      const startTime = performance.now()

      // Rapid updates
      for (let i = 0; i < 100; i++) {
        act(() => {
          processingStore.updateProcessingStatus('test-1', {
            progress: i,
          })
        })
      }

      const endTime = performance.now()

      // Should complete quickly (batched updates)
      expect(endTime - startTime).toBeLessThan(100)

      // Final state should be correct
      const item = processingStore.queue.find(item => item.id === 'test-1')
      expect(item?.progress).toBe(99)
    })

    it('should cleanup old data periodically', () => {
      const { processingStore } = store.getState()

      // Add old completed items
      const oldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago

      for (let i = 0; i < 5; i++) {
        act(() => {
          processingStore.addToQueue({
            id: `old-item-${i}`,
            file: new File(['test'], `old-${i}.mp3`),
            status: 'completed',
            progress: 100,
            completedAt: oldDate.toISOString(),
          })
        })
      }

      // Add recent items
      for (let i = 0; i < 3; i++) {
        act(() => {
          processingStore.addToQueue({
            id: `recent-item-${i}`,
            file: new File(['test'], `recent-${i}.mp3`),
            status: 'completed',
            progress: 100,
            completedAt: new Date().toISOString(),
          })
        })
      }

      // Trigger cleanup
      act(() => {
        processingStore.cleanupCompleted()
      })

      // Should only keep recent items
      expect(processingStore.queue).toHaveLength(3)
      expect(processingStore.queue.every(item => 
        item.id.startsWith('recent-item')
      )).toBe(true)
    })

    it('should implement efficient state selectors', () => {
      const { profilesStore } = store.getState()

      // Add many profiles
      for (let i = 0; i < 1000; i++) {
        act(() => {
          profilesStore.addProfile({
            id: `profile-${i}`,
            name: `Profile ${i}`,
            emotions: ['happy'],
            angles: ['CU'],
            createdAt: new Date().toISOString(),
          })
        })
      }

      const startTime = performance.now()

      // Select specific profile
      const selectedProfile = profilesStore.getProfileById('profile-500')

      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(10)
      expect(selectedProfile?.name).toBe('Profile 500')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle store hydration errors', () => {
      // Mock localStorage to throw error
      const originalGetItem = localStorage.getItem
      localStorage.getItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage access denied')
      })

      const { appStore } = store.getState()

      // Should fallback to defaults
      expect(appStore.settings.theme).toBe('light')

      localStorage.getItem = originalGetItem
    })

    it('should recover from state corruption', () => {
      const { profilesStore } = store.getState()

      // Add valid data first
      act(() => {
        profilesStore.addProfile({
          id: 'valid-1',
          name: 'Valid',
          emotions: ['happy'],
          angles: ['CU'],
          createdAt: new Date().toISOString(),
        })
      })

      // Simulate state corruption
      profilesStore.setState({
        profiles: null as any,
        selectedProfileId: 'invalid-id',
      })

      // Should recover gracefully
      expect(profilesStore.profiles).toEqual([])
      expect(profilesStore.selectedProfileId).toBeNull()
    })

    it('should implement state rollback on errors', () => {
      const { appStore } = store.getState()

      const originalState = appStore.getState()

      // Try invalid update
      expect(() => {
        act(() => {
          appStore.updateSettings({
            theme: 'invalid-theme' as any,
          })
        })
      }).toThrow()

      // State should be unchanged
      expect(appStore.getState()).toEqual(originalState)
    })
  })

  describe('Memory Management', () => {
    it('should cleanup event listeners on store destruction', () => {
      const { processingStore } = store.getState()

      const addListener = jest.spyOn(processingStore, 'subscribe' as any)

      // Add listener
      const unsubscribe = processingStore.subscribe(() => {})

      expect(addListener).toHaveBeenCalled()

      // Cleanup
      unsubscribe()

      // Should remove listener
      expect(processingStore.listeners?.size || 0).toBe(0)
    })

    it('should limit history size for time-series data', () => {
      const { systemStore } = store.getState()

      // Add many status updates
      for (let i = 0; i < 1000; i++) {
        act(() => {
          systemStore.updateSystemStatus({
            cpu: Math.random() * 100,
            memory: Math.random() * 100,
            disk: Math.random() * 100,
          })
        })
      }

      // Should limit history size
      expect(systemStore.history.length).toBeLessThanOrEqual(100)
    })

    it('should implement garbage collection for unused data', () => {
      const { profilesStore, processingStore } = store.getState()

      // Add profile and processing data
      act(() => {
        profilesStore.addProfile({
          id: 'temp-profile',
          name: 'Temp',
          emotions: ['happy'],
          angles: ['CU'],
          createdAt: new Date().toISOString(),
        })

        processingStore.addToQueue({
          id: 'temp-processing',
          file: new File(['test'], 'temp.mp3'),
          status: 'completed',
          progress: 100,
          completedAt: new Date().toISOString(),
        })
      })

      // Remove profile
      act(() => {
        profilesStore.removeProfile('temp-profile')
      })

      // Should cleanup related processing data
      expect(profilesStore.profiles).toHaveLength(0)
      expect(processingStore.queue.find(item => item.id === 'temp-processing')).toBeUndefined()
    })
  })

  describe('Type Safety and Validation', () => {
    it('should enforce type safety for store actions', () => {
      const { profilesStore } = store.getState()

      // TypeScript should catch type errors
      expect(() => {
        act(() => {
          // @ts-expect-error - Testing type safety
          profilesStore.addProfile({
            id: 123, // Should be string
            name: 'Test',
            emotions: ['happy'],
            angles: ['CU'],
            createdAt: new Date().toISOString(),
          })
        })
      }).toThrow()

      // Correct types should work
      expect(() => {
        act(() => {
          profilesStore.addProfile({
            id: 'string-id',
            name: 'Test',
            emotions: ['happy'],
            angles: ['CU'],
            createdAt: new Date().toISOString(),
          })
        })
      }).not.toThrow()
    })

    it('should validate enum values', () => {
      const { uiStore } = store.getState()

      // Valid theme
      expect(() => {
        act(() => {
          uiStore.setTheme('dark')
        })
      }).not.toThrow()

      // Invalid theme
      expect(() => {
        act(() => {
          // @ts-expect-error - Testing invalid enum
          uiStore.setTheme('invalid-theme')
        })
      }).toThrow()
    })
  })
})