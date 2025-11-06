/**
 * Comprehensive Integration Test Suite
 * Tests component interactions, state management, and data flow
 */

import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { WebSocketProvider } from '@/contexts/WebSocketContext'
import { store } from '@/stores'
import App from '@/app'

// Test utilities
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider>
          <WebSocketProvider>
            {ui}
          </WebSocketProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  )
}

// Mock WebSocket for testing
jest.mock('@/services/WebSocketManager', () => ({
  WebSocketManager: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    isConnected: true,
  })),
}))

// Mock API responses
const mockProfileData = {
  id: 'test-profile-1',
  name: 'Test Character',
  emotions: ['happy', 'sad', 'angry'],
  angles: ['CU', 'ECU', 'MS'],
  createdAt: new Date().toISOString(),
}

const mockProcessingData = {
  id: 'test-processing-1',
  status: 'processing',
  progress: 75,
  stages: [
    { name: 'Audio Analysis', status: 'completed' },
    { name: 'Emotion Detection', status: 'completed' },
    { name: 'Shot Selection', status: 'in-progress' },
    { name: 'Video Generation', status: 'pending' },
  ],
}

describe('Integration Tests', () => {
  beforeEach(() => {
    // Reset mocks and store
    jest.clearAllMocks()
    store.dispatch({ type: 'RESET_STORE' })
  })

  describe('Application Bootstrap', () => {
    it('should render application without critical errors', async () => {
      await act(async () => {
        renderWithProviders(<App />)
      })

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument()
      })

      // Verify critical components are present
      expect(screen.getByTestId('navigation')).toBeInTheDocument()
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })

    it('should initialize all stores correctly', async () => {
      const { stores } = require('@/stores')
      
      await act(async () => {
        renderWithProviders(<App />)
      })

      // Verify stores are initialized
      expect(stores.appStore.getState().initialized).toBe(true)
      expect(stores.profilesStore.getState().profiles).toEqual([])
      expect(stores.processingStore.getState().queue).toEqual([])
    })

    it('should establish WebSocket connection on mount', async () => {
      const mockWS = require('@/services/WebSocketManager').WebSocketManager
      const wsInstance = mockWS()

      await act(async () => {
        renderWithProviders(<App />)
      })

      expect(wsInstance.connect).toHaveBeenCalledTimes(1)
    })
  })

  describe('Profile Management Integration', () => {
    it('should handle complete profile creation workflow', async () => {
      renderWithProviders(<App />)

      // Navigate to profile management
      fireEvent.click(screen.getByText('Profiles'))

      // Create new profile
      fireEvent.click(screen.getByText('Create Profile'))
      
      const nameInput = screen.getByLabelText('Profile Name')
      fireEvent.change(nameInput, { target: { value: 'Test Character' } })

      // Select emotions
      fireEvent.click(screen.getByLabelText('Happy'))
      fireEvent.click(screen.getByLabelText('Sad'))

      // Select angles
      fireEvent.click(screen.getByLabelText('Close-Up'))

      // Save profile
      fireEvent.click(screen.getByText('Save Profile'))

      await waitFor(() => {
        expect(screen.getByText('Profile created successfully')).toBeInTheDocument()
      })

      // Verify profile appears in list
      expect(screen.getByText('Test Character')).toBeInTheDocument()
    })

    it('should sync profile data across components', async () => {
      const { profilesStore } = require('@/stores')
      
      renderWithProviders(<App />)

      // Add profile via store
      act(() => {
        profilesStore.addProfile(mockProfileData)
      })

      // Verify profile appears in selector
      await waitFor(() => {
        expect(screen.getByText('Test Character')).toBeInTheDocument()
      })

      // Verify profile appears in dashboard
      fireEvent.click(screen.getByText('Dashboard'))
      await waitFor(() => {
        expect(screen.getByText('Test Character')).toBeInTheDocument()
      })
    })

    it('should handle profile deletion with confirmation', async () => {
      const { profilesStore } = require('@/stores')
      
      // Add profile first
      act(() => {
        profilesStore.addProfile(mockProfileData)
      })

      renderWithProviders(<App />)

      // Navigate to profiles
      fireEvent.click(screen.getByText('Profiles'))

      // Delete profile
      fireEvent.click(screen.getByTestId(`delete-profile-${mockProfileData.id}`))
      
      // Confirm deletion
      fireEvent.click(screen.getByText('Confirm'))

      await waitFor(() => {
        expect(screen.queryByText('Test Character')).not.toBeInTheDocument()
      })

      // Verify store is updated
      expect(profilesStore.getState().profiles).toHaveLength(0)
    })
  })

  describe('Processing Pipeline Integration', () => {
    it('should handle complete audio processing workflow', async () => {
      const { processingStore } = require('@/stores')
      
      renderWithProviders(<App />)

      // Upload audio
      const fileInput = screen.getByLabelText('Audio File')
      const file = new File(['test audio'], 'test.mp3', { type: 'audio/mpeg' })
      
      fireEvent.change(fileInput, { target: { files: [file] } })

      // Start processing
      fireEvent.click(screen.getByText('Start Processing'))

      await waitFor(() => {
        expect(processingStore.getState().queue).toHaveLength(1)
      })

      // Simulate processing stages
      act(() => {
        processingStore.updateProcessingStatus('test-processing-1', mockProcessingData)
      })

      // Verify UI updates
      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument()
        expect(screen.getByText('Shot Selection')).toBeInTheDocument()
      })

      // Complete processing
      act(() => {
        processingStore.completeProcessing('test-processing-1')
      })

      await waitFor(() => {
        expect(screen.getByText('Processing completed')).toBeInTheDocument()
      })
    })

    it('should handle batch queue management', async () => {
      const { processingStore } = require('@/stores')
      
      renderWithProviders(<App />)

      // Add multiple items to queue
      const files = [
        new File(['audio1'], 'test1.mp3', { type: 'audio/mpeg' }),
        new File(['audio2'], 'test2.mp3', { type: 'audio/mpeg' }),
        new File(['audio3'], 'test3.mp3', { type: 'audio/mpeg' }),
      ]

      files.forEach((file, index) => {
        act(() => {
          processingStore.addToQueue({
            id: `test-${index}`,
            file,
            status: 'pending',
            progress: 0,
          })
        })
      })

      // Verify queue display
      await waitFor(() => {
        expect(screen.getByTestId('batch-queue')).toBeInTheDocument()
        expect(screen.getAllByTestId('queue-item')).toHaveLength(3)
      })

      // Process queue
      fireEvent.click(screen.getByText('Process Queue'))

      await waitFor(() => {
        const items = processingStore.getState().queue
        expect(items.every(item => item.status !== 'pending')).toBe(true)
      })
    })

    it('should handle processing errors and recovery', async () => {
      const { processingStore } = require('@/stores')
      
      renderWithProviders(<App />)

      // Start processing
      const fileInput = screen.getByLabelText('Audio File')
      const file = new File(['test audio'], 'test.mp3', { type: 'audio/mpeg' })
      
      fireEvent.change(fileInput, { target: { files: [file] } })
      fireEvent.click(screen.getByText('Start Processing'))

      // Simulate error
      act(() => {
        processingStore.setError('test-processing-1', new Error('Processing failed'))
      })

      await waitFor(() => {
        expect(screen.getByText('Processing failed')).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      // Retry processing
      fireEvent.click(screen.getByText('Retry'))

      await waitFor(() => {
        const item = processingStore.getState().queue[0]
        expect(item.status).toBe('pending')
      })
    })
  })

  describe('Real-time Data Synchronization', () => {
    it('should sync WebSocket events across components', async () => {
      const mockWS = require('@/services/WebSocketManager').WebSocketManager
      const wsInstance = mockWS()

      renderWithProviders(<App />)

      // Simulate WebSocket event
      const eventCallback = wsInstance.on.mock.calls.find(
        ([event]) => event === 'processing_update'
      )?.[1]

      if (eventCallback) {
        act(() => {
          eventCallback({
            type: 'processing_update',
            data: mockProcessingData,
          })
        })

        await waitFor(() => {
          expect(screen.getByText('75%')).toBeInTheDocument()
        })
      }
    })

    it('should handle connection failures gracefully', async () => {
      const mockWS = require('@/services/WebSocketManager').WebSocketManager
      const wsInstance = mockWS()

      // Simulate connection failure
      wsInstance.isConnected = false

      renderWithProviders(<App />)

      await waitFor(() => {
        expect(screen.getByText('Connection Lost')).toBeInTheDocument()
        expect(screen.getByText('Reconnect')).toBeInTheDocument()
      })

      // Test reconnection
      wsInstance.isConnected = true
      fireEvent.click(screen.getByText('Reconnect'))

      await waitFor(() => {
        expect(screen.queryByText('Connection Lost')).not.toBeInTheDocument()
      })
    })

    it('should buffer events during disconnection', async () => {
      const { EventBuffer } = require('@/services')
      const eventBuffer = new EventBuffer()

      renderWithProviders(<App />)

      // Add events to buffer during disconnection
      act(() => {
        eventBuffer.add({
          type: 'processing_update',
          data: mockProcessingData,
          timestamp: Date.now(),
        })
      })

      // Reconnect and flush buffer
      act(() => {
        eventBuffer.flush()
      })

      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument()
      })
    })
  })

  describe('State Management Integration', () => {
    it('should maintain state consistency across route changes', async () => {
      const { profilesStore, processingStore } = require('@/stores')
      
      // Set initial state
      act(() => {
        profilesStore.addProfile(mockProfileData)
        processingStore.addToQueue({
          id: 'test-queue-1',
          status: 'processing',
          progress: 50,
        })
      })

      renderWithProviders(<App />)

      // Navigate between routes
      fireEvent.click(screen.getByText('Dashboard'))
      await waitFor(() => {
        expect(screen.getByText('Test Character')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Processing'))
      await waitFor(() => {
        expect(screen.getByText('50%')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Dashboard'))
      await waitFor(() => {
        expect(screen.getByText('Test Character')).toBeInTheDocument()
      })

      // Verify state is preserved
      expect(profilesStore.getState().profiles).toHaveLength(1)
      expect(processingStore.getState().queue).toHaveLength(1)
    })

    it('should handle store persistence and restoration', async () => {
      const { appStore } = require('@/stores')
      
      renderWithProviders(<App />)

      // Change settings
      fireEvent.click(screen.getByText('Settings'))
      
      const themeSelect = screen.getByLabelText('Theme')
      fireEvent.change(themeSelect, { target: { value: 'dark' } })

      // Verify state is persisted
      expect(appStore.getState().settings.theme).toBe('dark')

      // Simulate page refresh
      window.location.reload()

      await waitFor(() => {
        expect(screen.getByDisplayValue('dark')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API failure
      jest.spyOn(require('@/utils/api'), 'default').mockRejectedValue(
        new Error('API Error')
      )

      renderWithProviders(<App />)

      // Trigger API call
      fireEvent.click(screen.getByText('Load Profiles'))

      await waitFor(() => {
        expect(screen.getByText('Failed to load profiles')).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      // Test retry mechanism
      jest.spyOn(require('@/utils/api'), 'default').mockResolvedValue({
        data: [mockProfileData],
      })

      fireEvent.click(screen.getByText('Retry'))

      await waitFor(() => {
        expect(screen.getByText('Test Character')).toBeInTheDocument()
      })
    })

    it('should handle critical errors with fallback UI', async () => {
      // Simulate critical error
      const originalError = console.error
      console.error = jest.fn()

      renderWithProviders(<App />)

      // Trigger critical error
      act(() => {
        throw new Error('Critical Error')
      })

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        expect(screen.getByText('Reload Page')).toBeInTheDocument()
      })

      console.error = originalError
    })
  })

  describe('Performance Integration', () => {
    it('should handle large datasets efficiently', async () => {
      const { profilesStore } = require('@/stores')
      
      // Add large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `profile-${i}`,
        name: `Profile ${i}`,
        emotions: ['happy'],
        angles: ['CU'],
        createdAt: new Date().toISOString(),
      }))

      act(() => {
        largeDataset.forEach(profile => profilesStore.addProfile(profile))
      })

      const startTime = performance.now()
      renderWithProviders(<App />)
      const endTime = performance.now()

      // Should render within acceptable time
      expect(endTime - startTime).toBeLessThan(1000)

      // Should handle virtual scrolling
      fireEvent.click(screen.getByText('Profiles'))
      
      await waitFor(() => {
        expect(screen.getByTestId('virtual-list')).toBeInTheDocument()
      })
    })

    it('should cleanup resources on unmount', async () => {
      const { unmount } = renderWithProviders(<App />)
      
      const mockWS = require('@/services/WebSocketManager').WebSocketManager
      const wsInstance = mockWS()

      unmount()

      expect(wsInstance.disconnect).toHaveBeenCalledTimes(1)
    })
  })
})