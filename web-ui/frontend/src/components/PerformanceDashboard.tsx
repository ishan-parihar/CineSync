import React, { useState, useEffect } from 'react'
import { 
  usePerformanceMonitoring, 
  useRenderPerformance, 
  useResourceMonitoring,
  usePerformanceBudgets,
  useScrollPerformance 
} from '@/hooks/usePerformanceMonitoring'

interface PerformanceDashboardProps {
  isVisible: boolean
  onClose: () => void
}

export function PerformanceDashboard({ isVisible, onClose }: PerformanceDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'resources' | 'budgets'>('overview')
  const { metrics, memoryUsage, isOnline, connectionType } = usePerformanceMonitoring()
  const { renderCount, getAverageRenderTime, renderTimes } = useRenderPerformance('PerformanceDashboard')
  const { resources, getResourceStats } = useResourceMonitoring()
  const { budgets, budgetViolations, clearViolations } = usePerformanceBudgets()
  const scrollMetrics = useScrollPerformance()

  if (!isVisible) return null

  const resourceStats = getResourceStats()
  const averageRenderTime = getAverageRenderTime()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Performance Dashboard</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {(['overview', 'metrics', 'resources', 'budgets'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Connection Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Connection</h3>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-lg font-semibold">{isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{connectionType}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Memory Usage</h3>
                  {memoryUsage ? (
                    <div>
                      <p className="text-lg font-semibold">
                        {(memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB
                      </p>
                      <p className="text-sm text-gray-600">
                        of {(memoryUsage.jsHeapSizeLimit / 1024 / 1024).toFixed(0)} MB
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Not available</p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Render Performance</h3>
                  <p className="text-lg font-semibold">{renderCount} renders</p>
                  <p className="text-sm text-gray-600">
                    Avg: {averageRenderTime.toFixed(2)}ms
                  </p>
                </div>
              </div>

              {/* Core Web Vitals */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Core Web Vitals</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(metrics).map(([key, value]) => {
                    const budget = budgets[key as keyof typeof budgets]
                    const isGood = budget ? value <= budget : true
                    
                    return (
                      <div key={key} className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500 mb-1">{key}</h4>
                        <p className={`text-lg font-semibold ${isGood ? 'text-green-600' : 'text-red-600'}`}>
                          {typeof value === 'number' ? value.toFixed(0) : 'N/A'}{key === 'CLS' ? '' : 'ms'}
                        </p>
                        {budget && (
                          <p className="text-xs text-gray-500">Budget: {budget}ms</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Scroll Events:</span>
                      <span>{scrollMetrics.scrollEvents}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Scroll Duration:</span>
                      <span>{scrollMetrics.averageScrollDuration.toFixed(2)}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Scroll Jank Events:</span>
                      <span className={scrollMetrics.jankEvents > 0 ? 'text-red-600' : 'text-green-600'}>
                        {scrollMetrics.jankEvents}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Detailed Metrics</h3>
              
              {/* Performance Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-medium mb-3">Navigation Timing</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    {Object.entries(metrics).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-600">{key}:</span>
                        <span className="font-medium">
                          {typeof value === 'number' ? value.toFixed(2) : 'N/A'}{key === 'CLS' ? '' : 'ms'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium mb-3">Memory Details</h4>
                  {memoryUsage ? (
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Used:</span>
                        <span className="font-medium">
                          {(memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-medium">
                          {(memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Limit:</span>
                        <span className="font-medium">
                          {(memoryUsage.jsHeapSizeLimit / 1024 / 1024).toFixed(0)} MB
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-500">
                      Memory monitoring not available
                    </div>
                  )}
                </div>
              </div>

              {/* Render Performance */}
              <div>
                <h4 className="text-md font-medium mb-3">Render Performance</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Render Times (last 10):</span>
                      <span>Avg: {averageRenderTime.toFixed(2)}ms</span>
                    </div>
                    <div className="flex space-x-1">
                      {renderTimes.slice(-10).map((time, index) => (
                        <div
                          key={index}
                          className="flex-1 bg-blue-200 rounded"
                          style={{ height: `${Math.min(100, (time.renderTime / 16) * 100)}%` }}
                          title={`${time.renderTime.toFixed(2)}ms`}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Resource Loading</h3>
              
              {/* Resource Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{resourceStats.count}</p>
                  <p className="text-sm text-gray-600">Total Requests</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{resourceStats.totalSize}</p>
                  <p className="text-sm text-gray-600">Total Size</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {resourceStats.averageLoadTime.toFixed(0)}ms
                  </p>
                  <p className="text-sm text-gray-600">Avg Load Time</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className={`text-2xl font-bold ${resourceStats.slowCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {resourceStats.slowCount}
                  </p>
                  <p className="text-sm text-gray-600">Slow Resources</p>
                </div>
              </div>

              {/* Resource List */}
              <div>
                <h4 className="text-md font-medium mb-3">Recent Resources</h4>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="text-left p-3">Resource</th>
                          <th className="text-left p-3">Type</th>
                          <th className="text-left p-3">Size</th>
                          <th className="text-left p-3">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resources.slice(-20).map((resource, index) => (
                          <tr key={index} className="border-t border-gray-200">
                            <td className="p-3 truncate max-w-xs" title={resource.name}>
                              {resource.name.split('/').pop()}
                            </td>
                            <td className="p-3">
                              {resource.initiatorType || 'unknown'}
                            </td>
                            <td className="p-3">
                              {resource.transferSize 
                                ? `${(resource.transferSize / 1024).toFixed(1)}KB`
                                : 'N/A'
                              }
                            </td>
                            <td className={`p-3 ${resource.duration > 1000 ? 'text-red-600' : ''}`}>
                              {resource.duration.toFixed(0)}ms
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'budgets' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Performance Budgets</h3>
                <button
                  onClick={clearViolations}
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                >
                  Clear Violations
                </button>
              </div>

              {/* Budget Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(budgets).map(([key, budget]) => {
                  const value = metrics[key as keyof typeof metrics]
                  const hasValue = typeof value === 'number'
                  const isViolation = hasValue && value > budget
                  
                  return (
                    <div key={key} className={`bg-gray-50 p-4 rounded-lg border-2 ${
                      isViolation ? 'border-red-300' : hasValue ? 'border-green-300' : 'border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{key}</h4>
                        {isViolation && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Violation</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Budget:</span>
                          <span>{budget}ms</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Actual:</span>
                          <span className={isViolation ? 'text-red-600' : 'text-green-600'}>
                            {hasValue ? `${value.toFixed(0)}ms` : 'N/A'}
                          </span>
                        </div>
                        {hasValue && (
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className={`h-2 rounded-full ${
                                isViolation ? 'bg-red-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, (value / budget) * 100)}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Violations List */}
              {budgetViolations.length > 0 && (
                <div>
                  <h4 className="text-md font-medium mb-3 text-red-600">Current Violations</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <ul className="space-y-2">
                      {budgetViolations.map((violation, index) => (
                        <li key={index} className="text-sm text-red-800">
                          ⚠️ {violation}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <h4 className="text-md font-medium mb-3">Optimization Recommendations</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <ul className="space-y-2 text-sm text-blue-800">
                    {averageRenderTime > 16 && (
                      <li>• Consider optimizing component renders - average render time is slow</li>
                    )}
                    {memoryUsage && (memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit) > 0.7 && (
                      <li>• Memory usage is high - consider implementing cleanup and memoization</li>
                    )}
                    {resourceStats.slowCount > 0 && (
                      <li>• Some resources are loading slowly - consider optimization or caching</li>
                    )}
                    {scrollMetrics.jankEvents > 5 && (
                      <li>• Scroll performance could be improved - consider debouncing scroll handlers</li>
                    )}
                    {budgetViolations.length === 0 && (
                      <li>✅ All performance budgets are currently being met!</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}