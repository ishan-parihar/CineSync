'use client';

import { useEffect, useState } from 'react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    window.location.reload()
  }

  return (
    <>
      <title>Offline - LipSyncAutomation</title>
      <meta name="description" content="You are currently offline" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* Offline Icon */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-200 rounded-full">
              {isOnline ? (
                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728M12 12v.01M12 12v.01M12 12v.01M12 12v.01M12 12v.01M12 12v.01M12 12v.01" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
          </div>

          {/* Main Content */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {isOnline ? 'Connection Restored' : 'You\'re Offline'}
          </h1>
          
          <p className="text-gray-600 mb-8">
            {isOnline 
              ? 'Your internet connection has been restored. You can continue using the application.'
              : 'Please check your internet connection and try again. Some features may not be available while offline.'
            }
          </p>

          {/* Connection Status */}
          <div className="mb-8 p-4 bg-gray-100 rounded-lg">
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-gray-700">
                Status: {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            {retryCount > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Retry attempts: {retryCount}
              </p>
            )}
          </div>

          {/* Available Features */}
          {!isOnline && (
            <div className="mb-8 text-left">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Available Offline:</h2>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  View cached profiles
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Access recent projects
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Browse documentation
                </li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!isOnline && (
              <button
                onClick={handleRetry}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Retry Connection
              </button>
            )}
            
            <button
              onClick={() => window.history.back()}
              className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Go Back
            </button>
            
            {isOnline && (
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Continue to Dashboard
              </button>
            )}
          </div>

          {/* Help Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h3>
            <p className="text-xs text-gray-600 mb-3">
              If you continue to experience connection issues, try these troubleshooting steps:
            </p>
            <ol className="text-xs text-gray-600 space-y-1 text-left">
              <li>1. Check your Wi-Fi or ethernet connection</li>
              <li>2. Restart your router or modem</li>
              <li>3. Clear your browser cache</li>
              <li>4. Try using a different browser</li>
              <li>5. Contact support if issues persist</li>
            </ol>
          </div>
        </div>
      </div>
    </>
  )
}