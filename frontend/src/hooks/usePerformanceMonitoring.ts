import { useEffect, useRef, useState, useCallback } from 'react'
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals'

interface PerformanceMetrics {
  FCP: number // First Contentful Paint
  FID: number // First Input Delay  
  CLS: number // Cumulative Layout Shift
  LCP: number // Largest Contentful Paint
  TTFB: number // Time to First Byte
}

interface MemoryUsage {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

interface RenderMetrics {
  renderTime: number
  timestamp: number
}

export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({})
  const [memoryUsage, setMemoryUsage] = useState<MemoryUsage | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [connectionType, setConnectionType] = useState<string>('unknown')
  const metricsRef = useRef<Partial<PerformanceMetrics>>({})

  // Collect Core Web Vitals
  useEffect(() => {
    const handleMetric = (metric: any) => {
      const newMetrics = { ...metricsRef.current, [metric.name]: metric.value }
      metricsRef.current = newMetrics
      setMetrics(newMetrics)

      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        sendToAnalytics(metric)
      }
    }

    onCLS(handleMetric)
    onFID(handleMetric)
    onFCP(handleMetric)
    onLCP(handleMetric)
    onTTFB(handleMetric)
  }, [])

  // Monitor memory usage
  useEffect(() => {
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMemoryUsage({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        })
      }
    }

    measureMemory()
    const interval = setInterval(measureMemory, 5000) // Every 5 seconds

    return () => clearInterval(interval)
  }, [])

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Get connection info if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      setConnectionType(connection.effectiveType || 'unknown')
      
      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || 'unknown')
      }
      
      connection.addEventListener('change', handleConnectionChange)
      
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
        connection.removeEventListener('change', handleConnectionChange)
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    metrics,
    memoryUsage,
    isOnline,
    connectionType,
  }
}

export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0)
  const renderTimes = useRef<RenderMetrics[]>([])
  const startTime = useRef<number>(0)

  useEffect(() => {
    startTime.current = performance.now()
    renderCount.current += 1

    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime.current
      
      renderTimes.current.push({
        renderTime,
        timestamp: Date.now(),
      })

      // Keep only last 10 renders
      if (renderTimes.current.length > 10) {
        renderTimes.current = renderTimes.current.slice(-10)
      }

      // Log slow renders
      if (renderTime > 16) { // > 60fps
        console.warn(`🐌 Slow render detected in ${componentName}:`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          renderCount: renderCount.current,
        })
      }
    }
  })

  const getAverageRenderTime = useCallback(() => {
    const times = renderTimes.current.map(r => r.renderTime)
    return times.reduce((a, b) => a + b, 0) / times.length || 0
  }, [])

  const getLastRenderTime = useCallback(() => {
    const last = renderTimes.current[renderTimes.current.length - 1]
    return last?.renderTime || 0
  }, [])

  return {
    renderCount: renderCount.current,
    getAverageRenderTime,
    getLastRenderTime,
    renderTimes: [...renderTimes.current],
  }
}

export function useResourceMonitoring() {
  const [resources, setResources] = useState<PerformanceResourceTiming[]>([])
  const [slowResources, setSlowResources] = useState<PerformanceResourceTiming[]>([])

  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceResourceTiming[]
      const newResources = [...resources, ...entries]
      
      setResources(newResources)
      
      // Identify slow resources (> 1 second)
      const slow = entries.filter(entry => entry.duration > 1000)
      if (slow.length > 0) {
        setSlowResources(prev => [...prev, ...slow])
        
        slow.forEach(resource => {
          console.warn(`🐌 Slow resource detected:`, {
            name: resource.name,
            duration: `${resource.duration.toFixed(2)}ms`,
            size: resource.transferSize ? `${(resource.transferSize / 1024).toFixed(2)}KB` : 'unknown',
          })
        })
      }
    })

    observer.observe({ entryTypes: ['resource'] })

    return () => observer.disconnect()
  }, [resources])

  const getResourceStats = useCallback(() => {
    const totalSize = resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0)
    const totalTime = resources.reduce((sum, resource) => sum + resource.duration, 0)
    
    return {
      count: resources.length,
      totalSize: `${(totalSize / 1024).toFixed(2)}KB`,
      averageLoadTime: totalTime / resources.length || 0,
      slowCount: slowResources.length,
    }
  }, [resources, slowResources])

  return {
    resources,
    slowResources,
    getResourceStats,
  }
}

export function useLongTaskMonitoring() {
  const [longTasks, setLongTasks] = useState<PerformanceEntry[]>([])

  useEffect(() => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        setLongTasks(prev => [...prev, ...entries])
        
        entries.forEach(entry => {
          console.warn(`⏰ Long task detected:`, {
            duration: `${entry.duration.toFixed(2)}ms`,
            startTime: entry.startTime,
          })
        })
      })

      try {
        observer.observe({ entryTypes: ['longtask'] })
      } catch (e) {
        // longtask entry type might not be supported
        console.warn('Long task monitoring not supported')
      }

      return () => observer.disconnect()
    }
  }, [])

  return { longTasks }
}

export function usePerformanceBudgets() {
  const [budgetViolations, setBudgetViolations] = useState<string[]>([])

  const budgets = {
    FCP: 2000,
    LCP: 2500,
    FID: 100,
    CLS: 0.1,
    TTFB: 800,
    BUNDLE_SIZE: 244 * 1024, // 244KB
  }

  const checkBudget = useCallback((metric: string, value: number) => {
    const budget = budgets[metric as keyof typeof budgets]
    if (budget && value > budget) {
      const violation = `${metric}: ${value} exceeds budget of ${budget}`
      setBudgetViolations(prev => [...prev, violation])
      console.warn(`🚨 Budget violation:`, violation)
      return false
    }
    return true
  }, [budgets])

  const clearViolations = useCallback(() => {
    setBudgetViolations([])
  }, [])

  return {
    budgets,
    budgetViolations,
    checkBudget,
    clearViolations,
  }
}

// Utility function to send metrics to analytics
function sendToAnalytics(metric: any) {
  // This would integrate with your analytics service
  // For now, we'll just log it
  console.log('Performance metric:', metric)
  
  // Example analytics integration:
  if (typeof (globalThis as any).gtag !== 'undefined') {
    (globalThis as any).gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    })
  }
}

// Performance monitoring hook for component lifecycle
export function useComponentPerformance(componentName: string) {
  const mountTime = useRef<number>(0)
  const unmountTime = useRef<number>(0)
  const interactionCount = useRef<number>(0)

  useEffect(() => {
    mountTime.current = performance.now()
    console.log(`🚀 Component ${componentName} mounted at:`, mountTime.current)

    return () => {
      unmountTime.current = performance.now()
      const lifetime = unmountTime.current - mountTime.current
      console.log(`🔚 Component ${componentName} unmounted. Lifetime:`, {
        lifetime: `${lifetime.toFixed(2)}ms`,
        interactions: interactionCount.current,
      })
    }
  }, [componentName])

  const trackInteraction = useCallback(() => {
    interactionCount.current += 1
  }, [])

  return {
    trackInteraction,
    getInteractionCount: () => interactionCount.current,
    getLifetime: () => unmountTime.current - mountTime.current,
  }
}

// Custom hook for monitoring scroll performance
export function useScrollPerformance() {
  const [scrollMetrics, setScrollMetrics] = useState({
    scrollEvents: 0,
    averageScrollDuration: 0,
    jankEvents: 0,
  })

  useEffect(() => {
    let scrollStartTime = 0
    let scrollDurations: number[] = []

    const handleScrollStart = () => {
      scrollStartTime = performance.now()
    }

    const handleScrollEnd = () => {
      if (scrollStartTime) {
        const duration = performance.now() - scrollStartTime
        scrollDurations.push(duration)
        
        // Keep only last 50 scroll events
        if (scrollDurations.length > 50) {
          scrollDurations = scrollDurations.slice(-50)
        }

        setScrollMetrics(prev => ({
          scrollEvents: prev.scrollEvents + 1,
          averageScrollDuration: scrollDurations.reduce((a, b) => a + b, 0) / scrollDurations.length,
          jankEvents: duration > 16 ? prev.jankEvents + 1 : prev.jankEvents,
        }))

        scrollStartTime = 0
      }
    }

    let scrollTimeout: NodeJS.Timeout
    const handleScroll = () => {
      clearTimeout(scrollTimeout)
      handleScrollStart()
      scrollTimeout = setTimeout(handleScrollEnd, 150)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [])

  return scrollMetrics
}