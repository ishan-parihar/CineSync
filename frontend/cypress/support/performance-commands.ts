// Performance testing commands for Cypress

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Measure page load performance
       */
      measurePageLoad(): Chainable<PerformanceMetrics>
      
      /**
       * Measure Core Web Vitals
       */
      measureCoreWebVitals(): Chainable<CoreWebVitals>
      
      /**
       * Check bundle size
       */
      checkBundleSize(maxSizeKB: number): Chainable<void>
      
      /**
       * Measure memory usage
       */
      measureMemoryUsage(): Chainable<MemoryUsage>
      
      /**
       * Test component render performance
       */
      measureComponentRender(componentSelector: string): Chainable<RenderMetrics>
      
      /**
       * Test animation performance
       */
      measureAnimationPerformance(animationSelector: string): Chainable<AnimationMetrics>
      
      /**
       * Check for memory leaks
       */
      checkMemoryLeaks(iterations: number): Chainable<void>
      
      /**
       * Measure network performance
       */
      measureNetworkPerformance(): Chainable<NetworkMetrics>
      
      /**
       * Test large dataset performance
       */
      testLargeDatasetPerformance(size: number): Chainable<DatasetMetrics>
      
      /**
       * Check performance budgets
       */
      checkPerformanceBudgets(): Chainable<void>
    }
  }
}

interface PerformanceMetrics {
  firstContentfulPaint: number
  largestContentfulPaint: number
  timeToInteractive: number
  firstInputDelay: number
  cumulativeLayoutShift: number
}

interface CoreWebVitals {
  LCP: number // Largest Contentful Paint
  FID: number // First Input Delay
  CLS: number // Cumulative Layout Shift
  FCP: number // First Contentful Paint
  TTFB: number // Time to First Byte
}

interface MemoryUsage {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

interface RenderMetrics {
  renderTime: number
  componentCount: number
  reflowCount: number
  repaintCount: number
}

interface AnimationMetrics {
  frameRate: number
  frameTime: number
  droppedFrames: number
}

interface NetworkMetrics {
  totalRequests: number
  totalSize: number
  slowRequests: number
  failedRequests: number
}

interface DatasetMetrics {
  renderTime: number
  scrollPerformance: number
  memoryUsage: number
}

// Performance budgets
const PERFORMANCE_BUDGETS = {
  FCP: 2000, // First Contentful Paint (ms)
  LCP: 2500, // Largest Contentful Paint (ms)
  FID: 100,  // First Input Delay (ms)
  CLS: 0.1,  // Cumulative Layout Shift
  TTI: 3000, // Time to Interactive (ms)
  TTFB: 800, // Time to First Byte (ms)
  BUNDLE_SIZE: 244, // KB (gzipped)
  MEMORY_USAGE: 50, // MB
}

Cypress.Commands.add('measurePageLoad', () => {
  cy.window().then((win) => {
    return new Promise((resolve) => {
      const metrics = {
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        timeToInteractive: 0,
        firstInputDelay: 0,
        cumulativeLayoutShift: 0,
      }

      // Get navigation timing
      const navigation = win.performance.getEntriesByType('navigation')[0]
      if (navigation) {
        metrics.firstContentfulPaint = navigation.responseStart - navigation.requestStart
        metrics.timeToInteractive = navigation.domInteractive - navigation.requestStart
      }

      // Get LCP
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        metrics.largestContentfulPaint = lastEntry.startTime
        resolve(metrics)
      }).observe({ entryTypes: ['largest-contentful-paint'] })

      // Get FID
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          metrics.firstInputDelay = entry.processingStart - entry.startTime
        })
      }).observe({ entryTypes: ['first-input'] })

      // Get CLS
      let clsValue = 0
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
            metrics.cumulativeLayoutShift = clsValue
          }
        })
      }).observe({ entryTypes: ['layout-shift'] })
    })
  })
})

Cypress.Commands.add('measureCoreWebVitals', () => {
  cy.window().then((win) => {
    return new Promise((resolve) => {
      const vitals: CoreWebVitals = {
        LCP: 0,
        FID: 0,
        CLS: 0,
        FCP: 0,
        TTFB: 0,
      }

      // LCP
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        vitals.LCP = lastEntry.startTime
        checkComplete()
      }).observe({ entryTypes: ['largest-contentful-paint'] })

      // FID
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          vitals.FID = entry.processingStart - entry.startTime
          checkComplete()
        })
      }).observe({ entryTypes: ['first-input'] })

      // CLS
      let clsValue = 0
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
            vitals.CLS = clsValue
          }
        })
        checkComplete()
      }).observe({ entryTypes: ['layout-shift'] })

      // FCP
      const navigation = win.performance.getEntriesByType('navigation')[0]
      if (navigation) {
        vitals.FCP = navigation.responseStart - navigation.requestStart
        vitals.TTFB = navigation.responseStart
      }

      let completed = 0
      const checkComplete = () => {
        completed++
        if (completed === 3) {
          resolve(vitals)
        }
      }
    })
  })
})

Cypress.Commands.add('checkBundleSize', (maxSizeKB) => {
  cy.request('/_next/static/chunks/pages/_app.js').then((response) => {
    const responseHeaders = response.headers
    const contentLength = responseHeaders['content-length']
    const sizeKB = Math.round(parseInt(contentLength) / 1024)
    
    cy.log(`Bundle size: ${sizeKB}KB`)
    
    if (sizeKB > maxSizeKB) {
      cy.log(`⚠️ Bundle size exceeds budget of ${maxSizeKB}KB`)
    }
    
    expect(sizeKB).to.be.lte(maxSizeKB)
  })
})

Cypress.Commands.add('measureMemoryUsage', () => {
  cy.window().then((win) => {
    if (win.performance && win.performance.memory) {
      const memory = {
        usedJSHeapSize: win.performance.memory.usedJSHeapSize,
        totalJSHeapSize: win.performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: win.performance.memory.jsHeapSizeLimit,
      }
      
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024)
      cy.log(`Memory usage: ${usedMB}MB`)
      
      return memory
    }
    return null
  })
})

Cypress.Commands.add('measureComponentRender', (componentSelector) => {
  cy.window().then((win) => {
    const startTime = win.performance.now()
    
    // Force reflow
    cy.get(componentSelector).then(($el) => {
      $el[0].offsetHeight
    })
    
    const endTime = win.performance.now()
    const renderTime = endTime - startTime
    
    const metrics = {
      renderTime,
      componentCount: win.document.querySelectorAll(componentSelector).length,
      reflowCount: 0, // Would need more complex setup to measure accurately
      repaintCount: 0, // Would need more complex setup to measure accurately
    }
    
    cy.log(`Component render time: ${renderTime}ms`)
    
    return metrics
  })
})

Cypress.Commands.add('measureAnimationPerformance', (animationSelector) => {
  cy.window().then((win) => {
    return new Promise((resolve) => {
      let frameCount = 0
      let lastTime = win.performance.now()
      let droppedFrames = 0
      
      const measureFrame = () => {
        const currentTime = win.performance.now()
        const deltaTime = currentTime - lastTime
        
        if (deltaTime > 16.67) { // 60fps = 16.67ms per frame
          droppedFrames++
        }
        
        frameCount++
        lastTime = currentTime
        
        if (frameCount < 60) { // Measure for 60 frames
          requestAnimationFrame(measureFrame)
        } else {
          const totalTime = win.performance.now() - (lastTime - (frameCount * 16.67))
          const frameRate = Math.round((frameCount / totalTime) * 1000)
          const frameTime = totalTime / frameCount
          
          resolve({
            frameRate,
            frameTime,
            droppedFrames,
          })
        }
      }
      
      requestAnimationFrame(measureFrame)
    })
  })
})

Cypress.Commands.add('checkMemoryLeaks', (iterations) => {
  cy.window().then((win) => {
    const measurements: number[] = []
    
    const measure = () => {
      if (win.performance && win.performance.memory) {
        measurements.push(win.performance.memory.usedJSHeapSize)
      }
    }
    
    const runIteration = (index: number) => {
      if (index < iterations) {
        // Simulate user interaction that might cause memory leaks
        cy.get('body').click()
        cy.wait(100)
        measure()
        
        // Force garbage collection if available
        if (win.gc) {
          win.gc()
        }
        
        cy.wait(100).then(() => {
          runIteration(index + 1)
        })
      } else {
        // Analyze memory growth
        if (measurements.length > 1) {
          const initialMemory = measurements[0]
          const finalMemory = measurements[measurements.length - 1]
          const memoryGrowth = finalMemory - initialMemory
          const growthMB = Math.round(memoryGrowth / 1024 / 1024)
          
          cy.log(`Memory growth over ${iterations} iterations: ${growthMB}MB`)
          
          if (growthMB > 10) {
            cy.log('⚠️ Potential memory leak detected')
          }
        }
      }
    }
    
    measure()
    runIteration(0)
  })
})

Cypress.Commands.add('measureNetworkPerformance', () => {
  cy.window().then((win) => {
    const resources = win.performance.getEntriesByType('resource')
    
    const metrics = {
      totalRequests: resources.length,
      totalSize: 0,
      slowRequests: 0,
      failedRequests: 0,
    }
    
    resources.forEach((resource: any) => {
      if (resource.transferSize) {
        metrics.totalSize += resource.transferSize
      }
      
      if (resource.duration > 1000) {
        metrics.slowRequests++
      }
      
      // Check for failed requests (would need additional setup)
    })
    
    const totalSizeKB = Math.round(metrics.totalSize / 1024)
    cy.log(`Network: ${metrics.totalRequests} requests, ${totalSizeKB}KB`)
    
    return metrics
  })
})

Cypress.Commands.add('testLargeDatasetPerformance', (size) => {
  cy.window().then((win) => {
    const startTime = win.performance.now()
    
    // Generate large dataset
    const data = Array.from({ length: size }, (_, i) => ({
      id: i,
      value: Math.random(),
      label: `Item ${i}`,
    }))
    
    // Simulate rendering large dataset
    cy.get('[data-testid="large-dataset-container"]').then(($el) => {
      // This would need to be implemented based on actual component
      const renderTime = win.performance.now() - startTime
      
      const metrics = {
        renderTime,
        scrollPerformance: 0, // Would need more complex measurement
        memoryUsage: 0, // Would need memory measurement
      }
      
      cy.log(`Large dataset (${size} items) render time: ${renderTime}ms`)
      
      return metrics
    })
  })
})

Cypress.Commands.add('checkPerformanceBudgets', () => {
  cy.measureCoreWebVitals().then((vitals) => {
    const budgets = PERFORMANCE_BUDGETS
    let passed = true
    
    if (vitals.FCP > budgets.FCP) {
      cy.log(`❌ FCP exceeds budget: ${vitals.FCP}ms > ${budgets.FCP}ms`)
      passed = false
    }
    
    if (vitals.LCP > budgets.LCP) {
      cy.log(`❌ LCP exceeds budget: ${vitals.LCP}ms > ${budgets.LCP}ms`)
      passed = false
    }
    
    if (vitals.FID > budgets.FID) {
      cy.log(`❌ FID exceeds budget: ${vitals.FID}ms > ${budgets.FID}ms`)
      passed = false
    }
    
    if (vitals.CLS > budgets.CLS) {
      cy.log(`❌ CLS exceeds budget: ${vitals.CLS} > ${budgets.CLS}`)
      passed = false
    }
    
    if (passed) {
      cy.log('✅ All performance budgets passed')
    }
  })
  
  cy.checkBundleSize(PERFORMANCE_BUDGETS.BUNDLE_SIZE)
  
  cy.measureMemoryUsage().then((memory) => {
    if (memory) {
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024)
      if (usedMB > PERFORMANCE_BUDGETS.MEMORY_USAGE) {
        cy.log(`⚠️ Memory usage exceeds budget: ${usedMB}MB > ${PERFORMANCE_BUDGETS.MEMORY_USAGE}MB`)
      }
    }
  })
})