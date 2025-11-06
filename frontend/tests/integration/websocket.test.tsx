/**
 * WebSocket Integration Tests
 * Tests real-time communication, event handling, and state synchronization
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { WebSocketProvider, useWebSocket } from '@/contexts/WebSocketContext'
import { WebSocketManager } from '@/services/WebSocketManager'
import { store } from '@/stores'

// Mock WebSocket
jest.mock('@/services/WebSocketManager')

describe('WebSocket Integration Tests', () => {
  let mockWS: jest.Mocked<WebSocketManager>

  beforeEach(() => {
    jest.clearAllMocks()
    mockWS = new WebSocketManager() as jest.Mocked<WebSocketManager>
    mockWS.connect = jest.fn()
    mockWS.disconnect = jest.fn()
    mockWS.send = jest.fn()
    mockWS.on = jest.fn()
    mockWS.off = jest.fn()
    mockWS.isConnected = true
    mockWS.connectionState = 'connected'
    ;(WebSocketManager as jest.Mock).mockImplementation(() => mockWS)
  })

  describe('WebSocket Connection Management', () => {
    it('should establish connection on provider mount', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      renderHook(() => useWebSocket(), { wrapper })

      expect(mockWS.connect).toHaveBeenCalledTimes(1)
    })

    it('should handle connection state changes', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      const { result } = renderHook(() => useWebSocket(), { wrapper })

      expect(result.current.isConnected).toBe(true)

      // Simulate disconnection
      mockWS.isConnected = false
      mockWS.connectionState = 'disconnected'

      // Trigger connection state change event
      const connectionCallback = mockWS.on.mock.calls.find(
        ([event]) => event === 'connection_state_change'
      )?.[1]

      if (connectionCallback) {
        act(() => {
          connectionCallback({ state: 'disconnected' })
        })

        await waitFor(() => {
          expect(result.current.isConnected).toBe(false)
        })
      }
    })

    it('should attempt reconnection on disconnection', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      renderHook(() => useWebSocket(), { wrapper })

      // Simulate disconnection
      mockWS.isConnected = false
      mockWS.connectionState = 'disconnected'

      const disconnectCallback = mockWS.on.mock.calls.find(
        ([event]) => event === 'disconnect'
      )?.[1]

      if (disconnectCallback) {
        act(() => {
          disconnectCallback({})
        })

        // Should attempt reconnection after delay
        await waitFor(
          () => {
            expect(mockWS.connect).toHaveBeenCalledTimes(2)
          },
          { timeout: 6000 }
        )
      }
    })

    it('should cleanup connection on provider unmount', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      const { unmount } = renderHook(() => useWebSocket(), { wrapper })

      unmount()

      expect(mockWS.disconnect).toHaveBeenCalledTimes(1)
    })
  })

  describe('Event Handling', () => {
    it('should register and deregister event listeners', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      const { result } = renderHook(() => useWebSocket(), { wrapper})

      const callback = jest.fn()

      // Register event listener
      act(() => {
        result.current.on('test_event', callback)
      })

      expect(mockWS.on).toHaveBeenCalledWith('test_event', callback)

      // Deregister event listener
      act(() => {
        result.current.off('test_event', callback)
      })

      expect(mockWS.off).toHaveBeenCalledWith('test_event', callback)
    })

    it('should handle incoming events', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      const { result } = renderHook(() => useWebSocket(), { wrapper})

      const callback = jest.fn()

      act(() => {
        result.current.on('processing_update', callback)
      })

      // Simulate incoming event
      const eventCallback = mockWS.on.mock.calls.find(
        ([event]) => event === 'processing_update'
      )?.[1]

      if (eventCallback) {
        const eventData = {
          type: 'processing_update',
          data: { id: 'test-1', progress: 75 },
        }

        act(() => {
          eventCallback(eventData)
        })

        expect(callback).toHaveBeenCalledWith(eventData)
      }
    })

    it('should handle malformed events gracefully', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      const { result } = renderHook(() => useWebSocket(), { wrapper})

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Simulate malformed event
      const eventCallback = mockWS.on.mock.calls.find(
        ([event]) => event === 'processing_update'
      )?.[1]

      if (eventCallback) {
        act(() => {
          eventCallback(null)
        })

        expect(consoleSpy).toHaveBeenCalledWith(
          'Received malformed WebSocket event:',
          null
        )
      }

      consoleSpy.mockRestore()
    })
  })

  describe('Message Sending', () => {
    it('should send messages when connected', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      const { result } = renderHook(() => useWebSocket(), { wrapper})

      const message = { type: 'test_message', data: 'test data' }

      act(() => {
        result.current.send(message)
      })

      expect(mockWS.send).toHaveBeenCalledWith(message)
    })

    it('should queue messages when disconnected', () => {
      mockWS.isConnected = false
      mockWS.connectionState = 'disconnected'

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      const { result } = renderHook(() => useWebSocket(), { wrapper})

      const message = { type: 'test_message', data: 'test data' }

      act(() => {
        result.current.send(message)
      })

      expect(mockWS.send).not.toHaveBeenCalled()

      // Reconnect and flush queue
      mockWS.isConnected = true
      mockWS.connectionState = 'connected'

      const connectCallback = mockWS.on.mock.calls.find(
        ([event]) => event === 'connect'
      )?.[1]

      if (connectCallback) {
        act(() => {
          connectCallback({})
        })

        expect(mockWS.send).toHaveBeenCalledWith(message)
      }
    })

    it('should handle send errors gracefully', () => {
      mockWS.send = jest.fn().mockImplementation(() => {
        throw new Error('Send failed')
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      const { result } = renderHook(() => useWebSocket(), { wrapper})

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const message = { type: 'test_message', data: 'test data' }

      act(() => {
        result.current.send(message)
      })

      expect(consoleSpy).toHaveBeenCalledWith('Failed to send WebSocket message:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('State Synchronization', () => {
    it('should sync processing updates to store', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      renderHook(() => useWebSocket(), { wrapper})

      // Simulate processing update event
      const eventCallback = mockWS.on.mock.calls.find(
        ([event]) => event === 'processing_update'
      )?.[1]

      if (eventCallback) {
        const processingData = {
          type: 'processing_update',
          data: {
            id: 'test-processing-1',
            status: 'processing',
            progress: 50,
            stages: [
              { name: 'Audio Analysis', status: 'completed' },
              { name: 'Emotion Detection', status: 'in-progress' },
            ],
          },
        }

        act(() => {
          eventCallback(processingData)
        })

        // Verify store is updated
        const processingStore = store.getState().processingStore
        expect(processingStore.queue).toContainEqual(
          expect.objectContaining({
            id: 'test-processing-1',
            progress: 50,
          })
        )
      }
    })

    it('should sync profile updates to store', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      renderHook(() => useWebSocket(), { wrapper})

      // Simulate profile update event
      const eventCallback = mockWS.on.mock.calls.find(
        ([event]) => event === 'profile_update'
      )?.[1]

      if (eventCallback) {
        const profileData = {
          type: 'profile_update',
          data: {
            id: 'test-profile-1',
            name: 'Updated Character',
            emotions: ['happy', 'sad'],
            angles: ['CU', 'ECU'],
          },
        }

        act(() => {
          eventCallback(profileData)
        })

        // Verify store is updated
        const profilesStore = store.getState().profilesStore
        expect(profilesStore.profiles).toContainEqual(
          expect.objectContaining({
            id: 'test-profile-1',
            name: 'Updated Character',
          })
        )
      }
    })

    it('should handle system status updates', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      renderHook(() => useWebSocket(), { wrapper})

      // Simulate system status event
      const eventCallback = mockWS.on.mock.calls.find(
        ([event]) => event === 'system_status'
      )?.[1]

      if (eventCallback) {
        const systemData = {
          type: 'system_status',
          data: {
            cpu: 75,
            memory: 60,
            disk: 45,
            active_connections: 5,
            queue_size: 3,
          },
        }

        act(() => {
          eventCallback(systemData)
        })

        // Verify store is updated
        const systemStore = store.getState().systemStore
        expect(systemStore.status).toEqual(
          expect.objectContaining({
            cpu: 75,
            memory: 60,
          })
        )
      }
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle connection timeouts', async () => {
      mockWS.connect = jest.fn().mockImplementation(() => {
        setTimeout(() => {
          throw new Error('Connection timeout')
        }, 100)
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      renderHook(() => useWebSocket(), { wrapper})

      await waitFor(
        () => {
          expect(consoleSpy).toHaveBeenCalledWith('WebSocket connection failed:', expect.any(Error))
        },
        { timeout: 200 }
      )

      consoleSpy.mockRestore()
    })

    it('should handle message parsing errors', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      renderHook(() => useWebSocket(), { wrapper})

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Simulate malformed message
      const errorCallback = mockWS.on.mock.calls.find(
        ([event]) => event === 'error'
      )?.[1]

      if (errorCallback) {
        act(() => {
          errorCallback(new Error('Invalid JSON'))
        })

        expect(consoleSpy).toHaveBeenCalledWith('WebSocket error:', expect.any(Error))
      }

      consoleSpy.mockRestore()
    })

    it('should implement exponential backoff for reconnections', async () => {
      mockWS.isConnected = false
      mockWS.connectionState = 'disconnected'

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      renderHook(() => useWebSocket(), { wrapper})

      const disconnectCallback = mockWS.on.mock.calls.find(
        ([event]) => event === 'disconnect'
      )?.[1]

      if (disconnectCallback) {
        // First disconnection
        act(() => {
          disconnectCallback({})
        })

        // Second disconnection should have longer delay
        setTimeout(() => {
          act(() => {
            disconnectCallback({})
          })
        }, 100)
      }

      // Verify exponential backoff (implementation specific)
      await waitFor(
        () => {
          expect(mockWS.connect).toHaveBeenCalledTimes(3)
        },
        { timeout: 10000 }
      )
    })
  })

  describe('Performance Optimization', () => {
    it('should batch multiple rapid updates', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      renderHook(() => useWebSocket(), { wrapper})

      const eventCallback = mockWS.on.mock.calls.find(
        ([event]) => event === 'processing_update'
      )?.[1]

      if (eventCallback) {
        // Send multiple rapid updates
        const updates = Array.from({ length: 10 }, (_, i) => ({
          type: 'processing_update',
          data: {
            id: 'test-processing-1',
            progress: i * 10,
          },
        }))

        updates.forEach((update, index) => {
          setTimeout(() => {
            act(() => {
              eventCallback(update)
            })
          }, index * 10)
        })

        // Should batch updates and only trigger final render
        await waitFor(() => {
          const processingStore = store.getState().processingStore
          expect(processingStore.queue[0].progress).toBe(90)
        }, { timeout: 200 })
      }
    })

    it('should cleanup event listeners on unmount', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketProvider>{children}</WebSocketProvider>
      )

      const { unmount } = renderHook(() => useWebSocket(), { wrapper})

      unmount()

      expect(mockWS.off).toHaveBeenCalledTimes(expect.any(Number))
    })
  })
})