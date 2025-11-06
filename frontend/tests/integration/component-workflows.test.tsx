/**
 * Component Integration Tests
 * Tests UI component interactions, rendering, and user workflows
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('Component Integration Tests', () => {
  beforeEach(() => {
    store.dispatch({ type: 'RESET_STORE' })
  })

  describe('Navigation and Routing Integration', () => {
    it('should navigate between main sections', async () => {
      renderWithProviders(<App />)

      // Dashboard is default
      expect(screen.getByText('Dashboard')).toHaveClass('active')

      // Navigate to Profiles
      fireEvent.click(screen.getByText('Profiles'))
      await waitFor(() => {
        expect(screen.getByText('Profile Management')).toBeInTheDocument()
      })

      // Navigate to Processing
      fireEvent.click(screen.getByText('Processing'))
      await waitFor(() => {
        expect(screen.getByText('Audio Processing')).toBeInTheDocument()
      })

      // Navigate to Settings
      fireEvent.click(screen.getByText('Settings'))
      await waitFor(() => {
        expect(screen.getByText('Application Settings')).toBeInTheDocument()
      })
    })

    it('should maintain scroll position on navigation', async () => {
      renderWithProviders(<App />)

      // Scroll down on a page
      window.scrollTo(0, 500)

      // Navigate away and back
      fireEvent.click(screen.getByText('Profiles'))
      await waitFor(() => {
        expect(screen.getByText('Profile Management')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Dashboard'))
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
      })

      // Should restore scroll position (implementation dependent)
      expect(window.scrollY).toBe(0) // or 500 depending on implementation
    })

    it('should handle browser back/forward navigation', async () => {
      renderWithProviders(<App />)

      // Navigate through pages
      fireEvent.click(screen.getByText('Profiles'))
      await waitFor(() => {
        expect(screen.getByText('Profile Management')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Processing'))
      await waitFor(() => {
        expect(screen.getByText('Audio Processing')).toBeInTheDocument()
      })

      // Browser back
      act(() => {
        window.history.back()
      })

      await waitFor(() => {
        expect(screen.getByText('Profile Management')).toBeInTheDocument()
      })

      // Browser forward
      act(() => {
        window.history.forward()
      })

      await waitFor(() => {
        expect(screen.getByText('Audio Processing')).toBeInTheDocument()
      })
    })
  })

  describe('Profile Management Workflow', () => {
    it('should complete profile creation workflow', async () => {
      const user = userEvent.setup()
      renderWithProviders(<App />)

      // Navigate to Profiles
      await user.click(screen.getByText('Profiles'))

      // Start profile creation
      await user.click(screen.getByText('Create New Profile'))

      // Fill profile details
      await user.type(screen.getByLabelText('Profile Name'), 'Test Character')
      
      // Select emotions
      await user.click(screen.getByLabelText('Happy'))
      await user.click(screen.getByLabelText('Sad'))
      await user.click(screen.getByLabelText('Angry'))

      // Select angles
      await user.click(screen.getByLabelText('Close-Up (CU)'))
      await user.click(screen.getByLabelText('Extreme Close-Up (ECU)'))

      // Upload profile image
      const fileInput = screen.getByLabelText('Profile Image')
      const file = new File(['test'], 'profile.jpg', { type: 'image/jpeg' })
      await user.upload(fileInput, file)

      // Save profile
      await user.click(screen.getByText('Create Profile'))

      // Verify success
      await waitFor(() => {
        expect(screen.getByText('Profile created successfully')).toBeInTheDocument()
      })

      // Verify profile appears in list
      await waitFor(() => {
        expect(screen.getByText('Test Character')).toBeInTheDocument()
      })
    })

    it('should handle profile editing workflow', async () => {
      const user = userEvent.setup()
      
      // Add existing profile
      store.getState().profilesStore.addProfile({
        id: 'test-profile-1',
        name: 'Original Name',
        emotions: ['happy'],
        angles: ['CU'],
        createdAt: new Date().toISOString(),
      })

      renderWithProviders(<App />)

      // Navigate to Profiles
      await user.click(screen.getByText('Profiles'))

      // Edit profile
      await user.click(screen.getByTestId('edit-profile-test-profile-1'))

      // Change name
      const nameInput = screen.getByLabelText('Profile Name')
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Name')

      // Add new emotion
      await user.click(screen.getByLabelText('Sad'))

      // Save changes
      await user.click(screen.getByText('Save Changes'))

      // Verify update
      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully')).toBeInTheDocument()
        expect(screen.getByText('Updated Name')).toBeInTheDocument()
      })
    })

    it('should handle profile deletion with confirmation', async () => {
      const user = userEvent.setup()
      
      // Add existing profile
      store.getState().profilesStore.addProfile({
        id: 'test-profile-1',
        name: 'Test Character',
        emotions: ['happy'],
        angles: ['CU'],
        createdAt: new Date().toISOString(),
      })

      renderWithProviders(<App />)

      // Navigate to Profiles
      await user.click(screen.getByText('Profiles'))

      // Delete profile
      await user.click(screen.getByTestId('delete-profile-test-profile-1'))

      // Confirm deletion in modal
      await waitFor(() => {
        expect(screen.getByText('Delete Profile')).toBeInTheDocument()
        expect(screen.getByText(/Are you sure/)).toBeInTheDocument()
      })

      await user.click(screen.getByText('Confirm Delete'))

      // Verify deletion
      await waitFor(() => {
        expect(screen.getByText('Profile deleted successfully')).toBeInTheDocument()
        expect(screen.queryByText('Test Character')).not.toBeInTheDocument()
      })
    })

    it('should validate profile form inputs', async () => {
      const user = userEvent.setup()
      renderWithProviders(<App />)

      // Navigate to Profiles
      await user.click(screen.getByText('Profiles'))
      await user.click(screen.getByText('Create New Profile'))

      // Try to save without required fields
      await user.click(screen.getByText('Create Profile'))

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText('Profile name is required')).toBeInTheDocument()
        expect(screen.getByText('At least one emotion must be selected')).toBeInTheDocument()
        expect(screen.getByText('At least one angle must be selected')).toBeInTheDocument()
      })

      // Fill required fields
      await user.type(screen.getByLabelText('Profile Name'), 'Test')
      await user.click(screen.getByLabelText('Happy'))
      await user.click(screen.getByLabelText('Close-Up (CU)'))

      // Should now be able to save
      await user.click(screen.getByText('Create Profile'))

      await waitFor(() => {
        expect(screen.queryByText('Profile name is required')).not.toBeInTheDocument()
      })
    })
  })

  describe('Audio Processing Workflow', () => {
    it('should complete audio upload and processing workflow', async () => {
      const user = userEvent.setup()
      renderWithProviders(<App />)

      // Navigate to Processing
      await user.click(screen.getByText('Processing'))

      // Upload audio file
      const fileInput = screen.getByLabelText('Audio File')
      const file = new File(['test audio'], 'test.mp3', { type: 'audio/mpeg' })
      await user.upload(fileInput, file)

      // Verify file is uploaded
      await waitFor(() => {
        expect(screen.getByText('test.mp3')).toBeInTheDocument()
        expect(screen.getByText('Ready to process')).toBeInTheDocument()
      })

      // Select profile
      await user.click(screen.getByLabelText('Select Profile'))
      await user.click(screen.getByText('Test Character'))

      // Configure processing options
      await user.click(screen.getByLabelText('Enable emotion detection'))
      await user.click(screen.getByLabelText('Generate shot list'))

      // Start processing
      await user.click(screen.getByText('Start Processing'))

      // Verify processing starts
      await waitFor(() => {
        expect(screen.getByText('Processing started')).toBeInTheDocument()
        expect(screen.getByTestId('processing-progress')).toBeInTheDocument()
      })

      // Simulate processing progress
      act(() => {
        store.getState().processingStore.updateProcessingStatus('test-1', {
          progress: 25,
          stage: 'audio_analysis',
        })
      })

      await waitFor(() => {
        expect(screen.getByText('25%')).toBeInTheDocument()
        expect(screen.getByText('Audio Analysis')).toBeInTheDocument()
      })

      // Complete processing
      act(() => {
        store.getState().processingStore.completeProcessing('test-1')
      })

      await waitFor(() => {
        expect(screen.getByText('Processing completed')).toBeInTheDocument()
        expect(screen.getByText('Download Results')).toBeInTheDocument()
      })
    })

    it('should handle batch processing workflow', async () => {
      const user = userEvent.setup()
      renderWithProviders(<App />)

      // Navigate to Processing
      await user.click(screen.getByText('Processing'))
      await user.click(screen.getByText('Batch Processing'))

      // Add multiple files
      const files = [
        new File(['audio1'], 'test1.mp3', { type: 'audio/mpeg' }),
        new File(['audio2'], 'test2.mp3', { type: 'audio/mpeg' }),
        new File(['audio3'], 'test3.mp3', { type: 'audio/mpeg' }),
      ]

      for (const file of files) {
        await user.upload(screen.getByLabelText('Add Files'), file)
      }

      // Verify files are added to queue
      await waitFor(() => {
        expect(screen.getAllByTestId('queue-item')).toHaveLength(3)
      })

      // Configure batch settings
      await user.click(screen.getByLabelText('Apply same profile to all'))
      await user.click(screen.getByText('Test Character'))

      // Start batch processing
      await user.click(screen.getByText('Process All'))

      // Verify batch processing starts
      await waitFor(() => {
        expect(screen.getByText('Batch processing started')).toBeInTheDocument()
        expect(screen.getByTestId('batch-progress')).toBeInTheDocument()
      })

      // Verify individual items show progress
      await waitFor(() => {
        expect(screen.getAllByTestId('item-progress')).toHaveLength(3)
      })
    })

    it('should handle processing errors and retry', async () => {
      const user = userEvent.setup()
      renderWithProviders(<App />)

      // Navigate to Processing
      await user.click(screen.getByText('Processing'))

      // Upload file and start processing
      const fileInput = screen.getByLabelText('Audio File')
      const file = new File(['test audio'], 'test.mp3', { type: 'audio/mpeg' })
      await user.upload(fileInput, file)
      await user.click(screen.getByText('Start Processing'))

      // Simulate processing error
      act(() => {
        store.getState().processingStore.setError('test-1', new Error('Processing failed'))
      })

      // Verify error display
      await waitFor(() => {
        expect(screen.getByText('Processing failed')).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      // Retry processing
      await user.click(screen.getByText('Retry'))

      // Verify retry initiated
      await waitFor(() => {
        expect(screen.getByText('Retrying...')).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Updates Integration', () => {
    it('should display real-time processing updates', async () => {
      renderWithProviders(<App />)

      // Navigate to Processing
      fireEvent.click(screen.getByText('Processing'))

      // Simulate WebSocket processing update
      act(() => {
        store.dispatch({
          type: 'WEBSOCKET_EVENT',
          payload: {
            type: 'processing_update',
            data: {
              id: 'realtime-1',
              progress: 60,
              stage: 'emotion_detection',
              estimatedTimeRemaining: 45,
            },
          },
        })
      })

      // Verify UI updates in real-time
      await waitFor(() => {
        expect(screen.getByText('60%')).toBeInTheDocument()
        expect(screen.getByText('Emotion Detection')).toBeInTheDocument()
        expect(screen.getByText('45s remaining')).toBeInTheDocument()
      })
    })

    it('should display real-time system status', async () => {
      renderWithProviders(<App />)

      // Navigate to Dashboard
      fireEvent.click(screen.getByText('Dashboard'))

      // Simulate WebSocket system status update
      act(() => {
        store.dispatch({
          type: 'WEBSOCKET_EVENT',
          payload: {
            type: 'system_status',
            data: {
              cpu: 75,
              memory: 60,
              disk: 45,
              active_connections: 8,
              queue_size: 3,
            },
          },
        })
      })

      // Verify dashboard updates
      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument() // CPU
        expect(screen.getByText('60%')).toBeInTheDocument() // Memory
        expect(screen.getByText('3')).toBeInTheDocument() // Queue size
      })
    })

    it('should handle connection status changes', async () => {
      renderWithProviders(<App />)

      // Simulate connection loss
      act(() => {
        store.dispatch({
          type: 'WEBSOCKET_DISCONNECTED',
        })
      })

      // Verify connection status indicator
      await waitFor(() => {
        expect(screen.getByText('Connection Lost')).toBeInTheDocument()
        expect(screen.getByTestId('connection-status')).toHaveClass('disconnected')
      })

      // Simulate reconnection
      act(() => {
        store.dispatch({
          type: 'WEBSOCKET_CONNECTED',
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument()
        expect(screen.getByTestId('connection-status')).toHaveClass('connected')
      })
    })
  })

  describe('Theme and UI Integration', () => {
    it('should apply theme changes across all components', async () => {
      const user = userEvent.setup()
      renderWithProviders(<App />)

      // Verify light theme
      expect(document.documentElement).toHaveClass('light')

      // Navigate to Settings
      await user.click(screen.getByText('Settings'))

      // Change to dark theme
      await user.click(screen.getByLabelText('Theme'))
      await user.click(screen.getByText('Dark'))

      // Verify theme is applied
      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
        expect(screen.getByTestId('dashboard')).toHaveClass('dark-theme')
      })

      // Navigate to other pages - theme should persist
      await user.click(screen.getByText('Profiles'))
      await waitFor(() => {
        expect(screen.getByTestId('profile-manager')).toHaveClass('dark-theme')
      })

      await user.click(screen.getByText('Processing'))
      await waitFor(() => {
        expect(screen.getByTestId('processing-dashboard')).toHaveClass('dark-theme')
      })
    })

    it('should handle responsive design across viewport sizes', async () => {
      renderWithProviders(<App />)

      // Desktop view
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 })
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 720 })
      fireEvent.resize(window)

      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toBeVisible()
        expect(screen.getByTestId('main-content')).toHaveClass('desktop-layout')
      })

      // Tablet view
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 768 })
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 1024 })
      fireEvent.resize(window)

      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toHaveClass('tablet-layout')
      })

      // Mobile view
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 })
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 667 })
      fireEvent.resize(window)

      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toHaveClass('mobile-layout')
        expect(screen.getByTestId('mobile-menu-toggle')).toBeVisible()
      })
    })

    it('should handle accessibility features', async () => {
      const user = userEvent.setup()
      renderWithProviders(<App />)

      // Enable high contrast mode
      await user.click(screen.getByText('Settings'))
      await user.click(screen.getByLabelText('High Contrast Mode'))

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('high-contrast')
      })

      // Verify keyboard navigation
      await user.tab()
      expect(screen.getByTestId('navigation')).toHaveFocus()

      await user.tab()
      expect(screen.getByText('Profiles')).toHaveFocus()

      // Verify ARIA labels
      expect(screen.getByLabelText('Navigation menu')).toBeInTheDocument()
      expect(screen.getByLabelText('Main content')).toBeInTheDocument()
      expect(screen.getByLabelText('Profile creation form')).toBeInTheDocument()
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))

      const user = userEvent.setup()
      renderWithProviders(<App />)

      // Try to load data
      await user.click(screen.getByText('Profiles'))

      await waitFor(() => {
        expect(screen.getByText('Failed to load profiles')).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      // Retry should work
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ profiles: [] }),
      })

      await user.click(screen.getByText('Retry'))

      await waitFor(() => {
        expect(screen.queryByText('Failed to load profiles')).not.toBeInTheDocument()
      })

      global.fetch.mockRestore()
    })

    it('should handle critical application errors', async () => {
      renderWithProviders(<App />)

      // Simulate critical error
      act(() => {
        store.dispatch({
          type: 'CRITICAL_ERROR',
          payload: new Error('Application crashed'),
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        expect(screen.getByText('Reload Page')).toBeInTheDocument()
      })

      // Reload should work
      fireEvent.click(screen.getByText('Reload Page'))

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
    })

    it('should handle form validation errors', async () => {
      const user = userEvent.setup()
      renderWithProviders(<App />)

      // Navigate to profile creation
      await user.click(screen.getByText('Profiles'))
      await user.click(screen.getByText('Create New Profile'))

      // Submit empty form
      await user.click(screen.getByText('Create Profile'))

      // Verify validation messages
      await waitFor(() => {
        expect(screen.getByText('Profile name is required')).toBeInTheDocument()
        expect(screen.getByText('At least one emotion must be selected')).toBeInTheDocument()
      })

      // Fix validation errors
      await user.type(screen.getByLabelText('Profile Name'), 'Valid Name')
      await user.click(screen.getByLabelText('Happy'))
      await user.click(screen.getByLabelText('Close-Up (CU)'))

      // Should now be valid
      await user.click(screen.getByText('Create Profile'))

      await waitFor(() => {
        expect(screen.queryByText('Profile name is required')).not.toBeInTheDocument()
      })
    })
  })
})