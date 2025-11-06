/**
 * Deployment Verification Tests
 * Tests production build, environment configuration, and deployment readiness
 */

import { test, expect } from '@playwright/test'
import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

test.describe('Deployment Verification', () => {
  test.beforeAll(async () => {
    // Build the application for testing
    try {
      execSync('npm run build', { cwd: process.cwd(), stdio: 'pipe' })
    } catch (error) {
      console.error('Build failed:', error)
      throw error
    }
  })

  test('should build successfully without errors', async () => {
    // Check if build directory exists
    const buildDir = path.join(process.cwd(), 'out')
    expect(existsSync(buildDir)).toBe(true)

    // Check critical build files
    const criticalFiles = [
      'out/index.html',
      'out/_next/static/chunks/main.js',
      'out/_next/static/chunks/webpack.js',
      'out/_next/static/chunks/pages/_app.js',
      'out/_next/static/chunks/pages/_document.js',
    ]

    for (const file of criticalFiles) {
      const filePath = path.join(process.cwd(), file)
      expect(existsSync(filePath), `Missing critical file: ${file}`).toBe(true)
    }

    // Check build output for errors
    const buildOutput = readFileSync(path.join(process.cwd(), 'out/index.html'), 'utf8')
    expect(buildOutput).not.toContain('error')
    expect(buildOutput).not.toContain('Error')
    expect(buildOutput).not.toContain('undefined')
    expect(buildOutput).not.toContain('null')
  })

  test('should have proper environment configuration', async ({ page }) => {
    // Test production environment variables
    process.env.NODE_ENV = 'production'
    
    await page.goto('/')
    
    // Verify production mode is enabled
    const isProduction = await page.evaluate(() => {
      return process.env.NODE_ENV === 'production'
    })
    
    // Check that development tools are disabled
    const hasDevTools = await page.evaluate(() => {
      return !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__
    })
    
    // In production, dev tools should not be available
    expect(hasDevTools).toBe(false)

    // Check that service worker is registered
    const hasServiceWorker = await page.evaluate(() => {
      return 'serviceWorker' in navigator && 
             (navigator as any).serviceWorker.controller !== null
    })
    
    expect(hasServiceWorker).toBe(true)
  })

  test('should handle static asset loading correctly', async ({ page }) => {
    await page.goto('/')
    
    // Monitor network requests for assets
    const assetRequests: any[] = []
    page.on('request', (request) => {
      if (request.resourceType() === 'script' || 
          request.resourceType() === 'stylesheet' ||
          request.resourceType() === 'image') {
        assetRequests.push({
          url: request.url(),
          resourceType: request.resourceType(),
          status: 'pending'
        })
      }
    })

    page.on('response', (response) => {
      const request = assetRequests.find(r => r.url === response.url())
      if (request) {
        request.status = response.status()
        request.headers = response.headers()
      }
    })

    await page.waitForLoadState('networkidle')

    // Verify all critical assets load successfully
    const failedAssets = assetRequests.filter(r => r.status >= 400)
    expect(failedAssets).toHaveLength(0)

    // Verify assets have proper caching headers
    const jsAssets = assetRequests.filter(r => r.resourceType === 'script')
    for (const asset of jsAssets) {
      expect(asset.headers['cache-control']).toMatch(/max-age=\d+/)
    }
  })

  test('should implement proper security headers', async ({ page }) => {
    const response = await page.goto('/')
    
    if (response) {
      const headers = response.headers()
      
      // Check security headers
      expect(headers['x-frame-options']).toBe('DENY')
      expect(headers['x-content-type-options']).toBe('nosniff')
      expect(headers['x-xss-protection']).toBe('1; mode=block')
      expect(headers['strict-transport-security']).toMatch(/max-age=\d+/)
      expect(headers['referrer-policy']).toMatch(/strict-origin-when-cross-origin|no-referrer-when-downgrade/)
      
      // Check CSP header
      if (headers['content-security-policy']) {
        const csp = headers['content-security-policy']
        expect(csp).toContain("default-src 'self'")
        expect(csp).toContain("script-src 'self'")
        expect(csp).toContain("style-src 'self' 'unsafe-inline'")
      }
    }
  })

  test('should handle API endpoints correctly', async ({ page }) => {
    await page.goto('/')
    
    // Test API endpoints
    const apiEndpoints = [
      '/api/health',
      '/api/profiles',
      '/api/processing/status',
      '/api/system/status',
    ]

    for (const endpoint of apiEndpoints) {
      const response = await page.evaluate(async (url) => {
        try {
          const response = await fetch(url)
          return {
            status: response.status,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
          }
        } catch (error) {
          return { error: error.message }
        }
      }, endpoint)

      expect(response.error).not.toBeDefined()
      expect(response.status).toBeLessThan(500)
      
      if (endpoint === '/api/health') {
        expect(response.status).toBe(200)
      }
    }
  })

  test('should handle database connections correctly', async ({ page }) => {
    await page.goto('/')
    
    // Test database connectivity
    const dbStatus = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/health/database')
        const data = await response.json()
        return data
      } catch (error) {
        return { error: error.message }
      }
    })

    expect(dbStatus.error).not.toBeDefined()
    expect(dbStatus.status).toBe('connected')
    expect(dbStatus.responseTime).toBeLessThan(100) // Should respond quickly
  })

  test('should handle CDN and caching correctly', async ({ page }) => {
    await page.goto('/')
    
    // Check CDN integration
    const cdnAssets = await page.evaluate(() => {
      const assets = document.querySelectorAll('img, script, link[rel="stylesheet"]')
      return Array.from(assets).map(asset => ({
        src: (asset as any).src || (asset as any).href,
        isCDN: (asset as any).src?.includes('cdn') || (asset as any).href?.includes('cdn')
      }))
    })

    // Verify CDN is being used for static assets
    const hasCDNAssets = cdnAssets.some(asset => asset.isCDN)
    if (process.env.USE_CDN === 'true') {
      expect(hasCDNAssets).toBe(true)
    }

    // Test caching behavior
    const cacheTest = await page.evaluate(async () => {
      const start = performance.now()
      await fetch('/api/health')
      const firstRequest = performance.now() - start

      const secondStart = performance.now()
      await fetch('/api/health')
      const secondRequest = performance.now() - secondStart

      return { firstRequest, secondRequest }
    })

    // Second request should be faster due to caching
    expect(cacheTest.secondRequest).toBeLessThanOrEqual(cacheTest.firstRequest)
  })

  test('should handle service worker correctly', async ({ page }) => {
    await page.goto('/')
    
    // Wait for service worker registration
    const swRegistered = await page.evaluate(async () => {
      return new Promise((resolve) => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            resolve(!!registration.active)
          }).catch(() => {
            resolve(false)
          })
        } else {
          resolve(false)
        }
      })
    })

    expect(swRegistered).toBe(true)

    // Test offline functionality
    await page.context().setOffline(true)
    
    const offlineTest = await page.evaluate(async () => {
      try {
        const response = await fetch('/')
        return response.ok
      } catch (error) {
        return false
      }
    })

    // Should serve cached content when offline
    expect(offlineTest).toBe(true)

    await page.context().setOffline(false)
  })

  test('should handle error pages correctly', async ({ page }) => {
    // Test 404 page
    await page.goto('/non-existent-page')
    
    await expect(page.locator('h1')).toContainText('404')
    await expect(page.locator('[data-testid="error-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="back-to-home"]')).toBeVisible()

    // Test 500 page
    await page.route('/api/error', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    await page.goto('/error')
    await expect(page.locator('[data-testid="error-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Internal server error')
  })

  test('should handle load balancing correctly', async ({ page }) => {
    // Make multiple concurrent requests
    const requests = Array.from({ length: 10 }, (_, i) => 
      page.evaluate(async (index) => {
        const start = performance.now()
        const response = await fetch(`/api/load-test/${index}`)
        const end = performance.now()
        return {
          index,
          status: response.status,
          responseTime: end - start,
          serverId: response.headers.get('x-server-id')
        }
      }, i)
    )

    const results = await Promise.all(requests)
    
    // All requests should succeed
    results.forEach(result => {
      expect(result.status).toBe(200)
      expect(result.responseTime).toBeLessThan(5000) // Should respond within 5 seconds
    })

    // Requests should be distributed across servers (if load balanced)
    const serverIds = results.map(r => r.serverId).filter(Boolean)
    const uniqueServers = [...new Set(serverIds)]
    
    if (process.env.LOAD_BALANCED === 'true') {
      expect(uniqueServers.length).toBeGreaterThan(1)
    }
  })

  test('should handle monitoring and logging correctly', async ({ page }) => {
    await page.goto('/')
    
    // Test monitoring endpoints
    const monitoringData = await page.evaluate(async () => {
      try {
        const [health, metrics, logs] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/metrics'),
          fetch('/api/logs/recent')
        ])

        return {
          health: await health.json(),
          metrics: await metrics.json(),
          logs: await logs.json()
        }
      } catch (error) {
        return { error: error.message }
      }
    })

    expect(monitoringData.error).not.toBeDefined()
    expect(monitoringData.health.status).toBe('healthy')
    expect(monitoringData.metrics).toBeDefined()
    expect(Array.isArray(monitoringData.logs)).toBe(true)

    // Test error logging
    await page.evaluate(() => {
      // Trigger an error for logging
      throw new Error('Test error for logging')
    })

    // Check if error was logged
    const errorLogged = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/logs/recent?level=error')
        const logs = await response.json()
        return logs.some((log: any) => log.message.includes('Test error for logging'))
      } catch (error) {
        return false
      }
    })

    expect(errorLogged).toBe(true)
  })

  test('should handle environment-specific configurations', async ({ page }) => {
    // Test different environment configurations
    const environments = ['development', 'staging', 'production']
    
    for (const env of environments) {
      // Set environment
      process.env.NODE_ENV = env
      
      await page.goto('/')
      
      const config = await page.evaluate(() => {
        return {
          apiUrl: (window as any).CONFIG?.API_URL,
          environment: (window as any).CONFIG?.ENVIRONMENT,
          features: (window as any).CONFIG?.FEATURES,
          analytics: (window as any).CONFIG?.ANALYTICS,
        }
      })

      // Verify environment-specific settings
      expect(config.environment).toBe(env)
      
      if (env === 'production') {
        expect(config.apiUrl).toMatch(/https:\/\/api\.example\.com/)
        expect(config.analytics).toBe(true)
      } else if (env === 'development') {
        expect(config.apiUrl).toMatch(/http:\/\/localhost:\d+/)
        expect(config.analytics).toBe(false)
      }
    }
  })

  test('should handle backup and recovery correctly', async ({ page }) => {
    await page.goto('/')
    
    // Test backup creation
    const backupCreated = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/backup/create', { method: 'POST' })
        const data = await response.json()
        return data.success
      } catch (error) {
        return false
      }
    })

    expect(backupCreated).toBe(true)

    // Test backup restoration
    const backupRestored = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/backup/restore', { method: 'POST' })
        const data = await response.json()
        return data.success
      } catch (error) {
        return false
      }
    })

    expect(backupRestored).toBe(true)

    // Verify data integrity after restoration
    await page.reload()
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
  })
})

test.describe('Performance Monitoring in Production', () => {
  test('should monitor application performance metrics', async ({ page }) => {
    await page.goto('/')
    
    // Collect performance metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const metrics = {
            navigation: performance.getEntriesByType('navigation')[0],
            paint: performance.getEntriesByType('paint'),
            resource: performance.getEntriesByType('resource'),
            memory: (performance as any).memory,
          }
          resolve(metrics)
        })
        observer.observe({ entryTypes: ['navigation', 'paint', 'resource'] })
      })
    })

    // Verify performance thresholds
    expect(metrics.navigation.loadEventEnd - metrics.navigation.loadEventStart).toBeLessThan(3000)
    expect(metrics.paint.find((p: any) => p.name === 'first-contentful-paint')?.startTime).toBeLessThan(2000)
    expect(metrics.paint.find((p: any) => p.name === 'largest-contentful-paint')?.startTime).toBeLessThan(2500)

    // Send metrics to monitoring service
    const metricsSent = await page.evaluate(async (performanceData) => {
      try {
        await fetch('/api/metrics/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(performanceData)
        })
        return true
      } catch (error) {
        return false
      }
    }, metrics)

    expect(metricsSent).toBe(true)
  })

  test('should handle real user monitoring (RUM)', async ({ page }) => {
    await page.goto('/')
    
    // Simulate user interactions
    await page.click('[data-testid="nav-profiles"]')
    await page.click('[data-testid="create-profile-btn"]')
    await page.fill('[data-testid="profile-name-input"]', 'RUM Test Profile')
    await page.click('[data-testid="save-profile-btn"]')

    // Check if RUM data was collected
    const rumData = await page.evaluate(async () => {
      return (window as any).rumData || []
    })

    expect(rumData.length).toBeGreaterThan(0)
    
    // Verify RUM data structure
    const hasRequiredFields = rumData.every((data: any) => 
      data.timestamp && 
      data.eventType && 
      data.duration !== undefined
    )
    expect(hasRequiredFields).toBe(true)

    // Send RUM data to analytics
    const rumSent = await page.evaluate(async (data) => {
      try {
        await fetch('/api/analytics/rum', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        return true
      } catch (error) {
        return false
      }
    }, rumData)

    expect(rumSent).toBe(true)
  })
})