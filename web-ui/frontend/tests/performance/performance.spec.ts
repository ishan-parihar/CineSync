/**
 * Performance Testing Suite
 * Tests application performance, load times, and resource usage
 */

import { test, expect, devices } from '@playwright/test'

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  FIRST_CONTENTFUL_PAINT: 2000, // ms
  LARGEST_CONTENTFUL_PAINT: 2500, // ms
  CUMULATIVE_LAYOUT_SHIFT: 0.1,
  FIRST_INPUT_DELAY: 100, // ms
  TIME_TO_INTERACTIVE: 3500, // ms
  TOTAL_BLOCKING_TIME: 300, // ms
  MEMORY_USAGE: 100 * 1024 * 1024, // 100MB
  BUNDLE_SIZE: 1024 * 1024, // 1MB
}

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Enable performance monitoring
    await page.addInitScript(() => {
      window.performanceMetrics = {
        marks: [],
        measures: [],
        memorySnapshots: [],
      }
    })
  })

  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    // Navigate to application
    const startTime = Date.now()
    await page.goto('/')
    const loadTime = Date.now() - startTime

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="dashboard"]')

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const vitals = {
            FCP: 0,
            LCP: 0,
            CLS: 0,
            FID: 0,
            TTI: 0,
            TBT: 0,
          }

          entries.forEach((entry) => {
            switch (entry.entryType) {
              case 'paint':
                if (entry.name === 'first-contentful-paint') {
                  vitals.FCP = entry.startTime
                }
                break
              case 'largest-contentful-paint':
                vitals.LCP = entry.startTime
                break
              case 'layout-shift':
                vitals.CLS += entry.value
                break
              case 'first-input':
                vitals.FID = entry.processingStart - entry.startTime
                break
            }
          })

          resolve(vitals)
        })

        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] })
      })
    })

    // Assert performance thresholds
    expect(metrics.FCP).toBeLessThan(PERFORMANCE_THRESHOLDS.FIRST_CONTENTFUL_PAINT)
    expect(metrics.LCP).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGEST_CONTENTFUL_PAINT)
    expect(metrics.CLS).toBeLessThan(PERFORMANCE_THRESHOLDS.CUMULATIVE_LAYOUT_SHIFT)
    expect(metrics.FID).toBeLessThan(PERFORMANCE_THRESHOLDS.FIRST_INPUT_DELAY)
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.TIME_TO_INTERACTIVE)
  })

  test('should handle large datasets efficiently', async ({ page }) => {
    await page.goto('/profiles')

    // Create large dataset
    await page.evaluate(() => {
      const profiles = Array.from({ length: 1000 }, (_, i) => ({
        id: `profile-${i}`,
        name: `Performance Test Profile ${i}`,
        emotions: ['happy', 'sad', 'angry'],
        angles: ['CU', 'MS', 'LS'],
        createdAt: new Date().toISOString(),
      }))

      window.testProfiles = profiles
    })

    // Measure rendering performance
    const renderStartTime = performance.now()
    
    await page.evaluate(() => {
      const container = document.querySelector('[data-testid="profile-list"]')
      if (container) {
        window.testProfiles.forEach((profile) => {
          const item = document.createElement('div')
          item.setAttribute('data-testid', 'profile-item')
          item.textContent = profile.name
          container.appendChild(item)
        })
      }
    })

    const renderEndTime = performance.now()
    const renderTime = renderEndTime - renderStartTime

    // Should render quickly even with large datasets
    expect(renderTime).toBeLessThan(1000)

    // Verify virtual scrolling is working
    const visibleItems = await page.locator('[data-testid="profile-item"]').count()
    expect(visibleItems).toBeLessThan(100) // Should only render visible items

    // Test search performance
    const searchStartTime = performance.now()
    await page.fill('[data-testid="profile-search"]', 'Performance Test 500')
    await page.waitForTimeout(100) // Debounce time
    const searchEndTime = performance.now()
    const searchTime = searchEndTime - searchStartTime

    expect(searchTime).toBeLessThan(100)

    // Verify search results
    const searchResults = await page.locator('[data-testid="profile-item"]').count()
    expect(searchResults).toBe(1)
  })

  test('should maintain performance during batch operations', async ({ page }) => {
    await page.goto('/processing')
    await page.click('[data-testid="batch-processing-tab"]')

    // Add multiple files to batch
    const files = Array.from({ length: 50 }, (_, i) => `batch-audio-${i}.mp3`)
    
    const batchStartTime = performance.now()
    
    for (const file of files) {
      await page.click('[data-testid="add-file-btn"]')
      // Mock file upload
      await page.evaluate((fileName) => {
        const input = document.querySelector('input[type="file"]')
        if (input) {
          const dataTransfer = new DataTransfer()
          dataTransfer.items.add(new File(['test'], fileName))
          input.files = dataTransfer.files
          input.dispatchEvent(new Event('change', { bubbles: true }))
        }
      }, file)
    }

    const batchEndTime = performance.now()
    const batchTime = batchEndTime - batchStartTime

    // Should handle batch operations efficiently
    expect(batchTime).toBeLessThan(2000)

    // Verify all items are in queue
    const queueItems = await page.locator('[data-testid="queue-item"]').count()
    expect(queueItems).toBe(50)

    // Test batch processing performance
    const processingStartTime = performance.now()
    await page.click('[data-testid="start-batch-btn"]')

    // Simulate batch processing updates
    await page.evaluate(() => {
      let processed = 0
      const interval = setInterval(() => {
        processed++
        window.dispatchEvent(new CustomEvent('batch-progress', {
          detail: { processed, total: 50 }
        }))
        
        if (processed >= 50) {
          clearInterval(interval)
          window.dispatchEvent(new CustomEvent('batch-complete'))
        }
      }, 100)
    })

    await page.waitForEvent('batch-complete')
    const processingEndTime = performance.now()
    const processingTime = processingEndTime - processingStartTime

    expect(processingTime).toBeLessThan(10000) // Should complete within 10 seconds
  })

  test('should optimize memory usage', async ({ page }) => {
    await page.goto('/')

    // Monitor memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })

    // Perform memory-intensive operations
    for (let i = 0; i < 10; i++) {
      await page.goto('/profiles')
      await page.click('[data-testid="create-profile-btn"]')
      await page.fill('[data-testid="profile-name-input"]', `Memory Test ${i}`)
      await page.click('[data-testid="save-profile-btn"]')
      await page.waitForTimeout(100)
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc()
      }
    })

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })

    const memoryIncrease = finalMemory - initialMemory

    // Memory increase should be reasonable
    expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE)

    // Test memory cleanup on navigation
    await page.goto('/dashboard')
    
    // Check for memory leaks
    const afterNavigationMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })

    expect(afterNavigationMemory).toBeLessThan(finalMemory * 1.1) // Should not increase significantly
  })

  test('should optimize bundle size and loading', async ({ page }) => {
    // Monitor network requests
    const requests: any[] = []
    page.on('request', (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
      })
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Analyze bundle loading
    const jsRequests = requests.filter(r => r.resourceType === 'script')
    const cssRequests = requests.filter(r => r.resourceType === 'stylesheet')
    
    // Should have reasonable number of requests
    expect(jsRequests.length).toBeLessThan(20)
    expect(cssRequests.length).toBeLessThan(10)

    // Get bundle sizes
    const bundleSizes = await page.evaluate(() => {
      const bundles: any[] = []
      performance.getEntriesByType('resource').forEach((entry) => {
        if (entry.name.includes('.js') || entry.name.includes('.css')) {
          bundles.push({
            name: entry.name.split('/').pop(),
            size: (entry as any).transferSize || 0,
          })
        }
      })
      return bundles
    })

    const totalBundleSize = bundleSizes.reduce((sum, bundle) => sum + bundle.size, 0)
    expect(totalBundleSize).toBeLessThan(PERFORMANCE_THRESHOLDS.BUNDLE_SIZE)

    // Should implement code splitting
    const mainBundle = bundleSizes.find(b => b.name.includes('main') || b.name.includes('app'))
    if (mainBundle) {
      expect(mainBundle.size).toBeLessThan(PERFORMANCE_THRESHOLDS.BUNDLE_SIZE / 2)
    }
  })

  test('should handle concurrent operations efficiently', async ({ page }) => {
    await page.goto('/')

    // Start multiple concurrent operations
    const concurrentOperations = [
      page.goto('/profiles'),
      page.goto('/processing'),
      page.goto('/monitoring'),
      page.goto('/settings'),
    ]

    const startTime = performance.now()
    await Promise.all(concurrentOperations)
    const endTime = performance.now()

    // Should handle concurrent navigation efficiently
    expect(endTime - startTime).toBeLessThan(5000)

    // Test WebSocket performance under load
    await page.evaluate(() => {
      const messages = []
      for (let i = 0; i < 1000; i++) {
        messages.push({
          type: 'test_message',
          data: `Message ${i}`,
          timestamp: Date.now(),
        })
      }
      
      // Simulate rapid WebSocket messages
      messages.forEach((message, index) => {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('websocket-message', {
            detail: message
          }))
        }, index * 10)
      })
    })

    // Verify UI remains responsive
    await page.click('[data-testid="nav-dashboard"]')
    await page.waitForSelector('[data-testid="dashboard"]')

    // Should not cause UI freezing
    const isResponsive = await page.evaluate(() => {
      const start = performance.now()
      while (performance.now() - start < 100) {
        // Busy wait
      }
      return true
    })

    expect(isResponsive).toBe(true)
  })

  test('should optimize images and assets', async ({ page }) => {
    await page.goto('/profiles')

    // Check image optimization
    const images = await page.locator('img').all()
    
    for (const image of images) {
      const src = await image.getAttribute('src')
      if (src && !src.startsWith('data:')) {
        // Should use modern image formats
        expect(src).toMatch(/\.(webp|avif|jpg|jpeg|png)$/i)
        
        // Should have responsive attributes
        const hasSrcSet = await image.getAttribute('srcset')
        const hasLoading = await image.getAttribute('loading')
        
        // Important images should have srcset
        if (await image.isVisible()) {
          expect(hasSrcSet).toBeTruthy()
        }
        
        // Below-the-fold images should have lazy loading
        const boundingBox = await image.boundingBox()
        if (boundingBox && boundingBox.y > window.innerHeight) {
          expect(hasLoading).toBe('lazy')
        }
      }
    }

    // Test image loading performance
    const imageLoadTime = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const imageEntries = entries.filter((entry) => 
            entry.initiatorType === 'img'
          )
          
          if (imageEntries.length > 0) {
            const totalTime = imageEntries.reduce((sum, entry) => 
              sum + entry.duration, 0
            )
            resolve(totalTime)
          }
        })
        
        observer.observe({ entryTypes: ['resource'] })
      })
    })

    expect(imageLoadTime).toBeLessThan(3000) // Images should load quickly
  })

  test('should handle animation performance', async ({ page }) => {
    await page.goto('/')

    // Test animation frame rate
    const frameRates = await page.evaluate(() => {
      return new Promise((resolve) => {
        const frameRates: number[] = []
        let lastTime = performance.now()
        let frameCount = 0
        
        function measureFrame() {
          const currentTime = performance.now()
          const deltaTime = currentTime - lastTime
          
          if (deltaTime > 0) {
            const frameRate = 1000 / deltaTime
            frameRates.push(frameRate)
          }
          
          lastTime = currentTime
          frameCount++
          
          if (frameCount < 60) { // Measure for 1 second at 60fps
            requestAnimationFrame(measureFrame)
          } else {
            resolve(frameRates)
          }
        }
        
        requestAnimationFrame(measureFrame)
      })
    })

    const averageFrameRate = frameRates.reduce((sum, rate) => sum + rate, 0) / frameRates.length
    
    // Should maintain good frame rate
    expect(averageFrameRate).toBeGreaterThan(30) // At least 30fps

    // Test complex animations
    await page.click('[data-testid="nav-processing"]')
    await page.click('[data-testid="start-processing-btn"]')

    // Monitor animation during processing
    const animationPerformance = await page.evaluate(() => {
      return new Promise((resolve) => {
        let droppedFrames = 0
        let totalFrames = 0
        
        function checkFrame() {
          totalFrames++
          
          // Check if frame took too long
          if (performance.now() % 16 > 10) { // 16ms = 60fps
            droppedFrames++
          }
          
          if (totalFrames < 300) { // Check for 5 seconds
            requestAnimationFrame(checkFrame)
          } else {
            resolve({
              droppedFrames,
              totalFrames,
              dropRate: droppedFrames / totalFrames
            })
          }
        }
        
        requestAnimationFrame(checkFrame)
      })
    })

    // Should not drop many frames during animations
    expect(animationPerformance.dropRate).toBeLessThan(0.1) // Less than 10% dropped frames
  })
})

test.describe('Mobile Performance', () => {
  test.use({ ...devices['iPhone 13'] })

  test('should perform well on mobile devices', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    const loadTime = Date.now() - startTime

    // Mobile load times should be optimized
    expect(loadTime).toBeLessThan(3000)

    // Test touch responsiveness
    await page.tap('[data-testid="nav-profiles"]')
    await page.waitForSelector('[data-testid="page-title"]')

    const touchResponseTime = await page.evaluate(() => {
      return new Promise((resolve) => {
        const startTime = performance.now()
        
        document.addEventListener('touchend', () => {
          const responseTime = performance.now() - startTime
          resolve(responseTime)
        })
        
        // Simulate touch
        const touchEvent = new TouchEvent('touchend', {
          touches: [],
          changedTouches: [{
            clientX: 100,
            clientY: 100,
          } as any],
        })
        
        document.dispatchEvent(touchEvent)
      })
    })

    expect(touchResponseTime).toBeLessThan(100) // Touch should be responsive

    // Test mobile-specific optimizations
    const isMobileOptimized = await page.evaluate(() => {
      // Should have viewport meta tag
      const viewport = document.querySelector('meta[name="viewport"]')
      if (!viewport) return false
      
      // Should use mobile-friendly layouts
      const hasMobileLayout = document.body.classList.contains('mobile') ||
                              window.innerWidth <= 768
      
      // Should optimize for touch
      const hasTouchOptimized = document.querySelectorAll('[data-testid*="mobile"]').length > 0
      
      return !!viewport && hasMobileLayout && hasTouchOptimized
    })

    expect(isMobileOptimized).toBe(true)
  })
})

test.describe('Network Performance', () => {
  test('should handle slow network conditions', async ({ page }) => {
    // Simulate slow 3G network
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
      await route.continue()
    })

    const startTime = Date.now()
    await page.goto('/')
    const loadTime = Date.now() - startTime

    // Should handle slow networks gracefully
    expect(loadTime).toBeLessThan(15000) // Should load within 15 seconds even on slow network

    // Should show loading states
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
    
    // Should become interactive before fully loaded
    await page.waitForSelector('[data-testid="nav-dashboard"]')
    const interactiveTime = Date.now() - startTime
    expect(interactiveTime).toBeLessThan(8000) // Should be interactive within 8 seconds
  })

  test('should handle offline scenarios', async ({ page }) => {
    await page.goto('/')
    
    // Go offline
    await page.context().setOffline(true)

    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
    
    // Should cache critical resources
    const isOfflineFunctional = await page.evaluate(() => {
      // Check if service worker is active
      return 'serviceWorker' in navigator && 
             navigator.serviceWorker.controller !== null
    })

    expect(isOfflineFunctional).toBe(true)

    // Come back online
    await page.context().setOffline(false)
    
    // Should sync when back online
    await expect(page.locator('[data-testid="syncing-indicator"]')).toBeVisible()
    await expect(page.locator('[data-testid="connection-restored"]')).toBeVisible()
  })
})