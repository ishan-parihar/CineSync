/**
 * Security Testing Suite
 * Tests for vulnerabilities, authentication, authorization, and data protection
 */

import { test, expect } from '@playwright/test'

test.describe('Security Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should prevent XSS attacks', async ({ page }) => {
    // Test script injection in inputs
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src="x" onerror="alert(\'XSS\')">',
      '<svg onload="alert(\'XSS\')">',
      '"><script>alert("XSS")</script>',
      '\';alert("XSS");//',
    ]

    for (const payload of xssPayloads) {
      await page.goto('/profiles')
      await page.click('[data-testid="create-profile-btn"]')
      await page.fill('[data-testid="profile-name-input"]', payload)
      await page.click('[data-testid="save-profile-btn"]')

      // Check if script was executed (alert should not appear)
      const hasAlert = await page.evaluate(() => {
        return window.alertCalled === true
      })
      expect(hasAlert).toBe(false)

      // Check if payload is properly escaped
      const displayedValue = await page.inputValue('[data-testid="profile-name-input"]')
      expect(displayedValue).not.toContain('<script>')
      expect(displayedValue).not.toContain('javascript:')
    }

    // Test XSS in URL parameters
    await page.goto('/profiles?search=<script>alert("XSS")</script>')
    const searchValue = await page.inputValue('[data-testid="profile-search"]')
    expect(searchValue).not.toContain('<script>')
  })

  test('should prevent SQL injection', async ({ page }) => {
    const sqlPayloads = [
      "'; DROP TABLE profiles; --",
      "1' OR '1'='1",
      "1; DELETE FROM profiles WHERE 1=1; --",
      "admin'--",
      "admin' /*",
      "' OR 1=1#",
    ]

    for (const payload of sqlPayloads) {
      // Test SQL injection in search
      await page.goto('/profiles')
      await page.fill('[data-testid="profile-search"]', payload)
      await page.click('[data-testid="search-btn"]')

      // Should not cause server errors
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="profile-list"]')).toBeVisible()

      // Test SQL injection in form submission
      await page.click('[data-testid="create-profile-btn"]')
      await page.fill('[data-testid="profile-name-input"]', payload)
      await page.click('[data-testid="save-profile-btn"]')

      // Should handle gracefully without database errors
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible()
    }
  })

  test('should implement proper authentication', async ({ page }) => {
    // Test login with invalid credentials
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'invalid@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-btn"]')

    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials')
    await expect(page).toHaveURL('/login')

    // Test login with valid credentials
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'correctpassword')
    await page.click('[data-testid="login-btn"]')

    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()

    // Test session management
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find(c => c.name === 'session')
    expect(sessionCookie).toBeDefined()
    expect(sessionCookie?.httpOnly).toBe(true)
    expect(sessionCookie?.secure).toBe(true)
    expect(sessionCookie?.sameSite).toBe('Strict')

    // Test logout
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-btn"]')

    await expect(page).toHaveURL('/login')
    
    // Verify session is cleared
    const cookiesAfterLogout = await page.context().cookies()
    const sessionCookieAfterLogout = cookiesAfterLogout.find(c => c.name === 'session')
    expect(sessionCookieAfterLogout).toBeUndefined()
  })

  test('should implement proper authorization', async ({ page }) => {
    // Login as regular user
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'user@example.com')
    await page.fill('[data-testid="password-input"]', 'password')
    await page.click('[data-testid="login-btn"]')

    // Try to access admin endpoints
    const adminEndpoints = [
      '/admin/users',
      '/admin/settings',
      '/admin/logs',
      '/api/admin/users',
    ]

    for (const endpoint of adminEndpoints) {
      await page.goto(endpoint)
      
      // Should redirect to unauthorized page or show error
      const isUnauthorized = await page.locator('[data-testid="unauthorized"]').isVisible() ||
                             await page.locator('[data-testid="error-page"]').isVisible() ||
                             page.url().includes('/unauthorized')
      
      expect(isUnauthorized).toBe(true)
    }

    // Test API authorization
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/admin/users')
        return {
          status: response.status,
          data: await response.json()
        }
      } catch (error) {
        return { error: error.message }
      }
    })

    expect(apiResponse.status).toBe(403)
    expect(apiResponse.data.error).toContain('Unauthorized')
  })

  test('should protect sensitive data', async ({ page }) => {
    // Login and access profile with sensitive data
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password')
    await page.click('[data-testid="login-btn"]')

    await page.goto('/profiles')
    await page.click('[data-testid="profile-with-sensitive-data"]')

    // Check that sensitive data is not exposed in HTML
    const pageContent = await page.content()
    expect(pageContent).not.toContain('password')
    expect(pageContent).not.toContain('secret')
    expect(pageContent).not.toContain('token')
    expect(pageContent).not.toContain('api_key')

    // Check that API responses don't expose sensitive data
    const profileData = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/profiles/sensitive')
        const data = await response.json()
        return data
      } catch (error) {
        return { error: error.message }
      }
    })

    expect(profileData.password).toBeUndefined()
    expect(profileData.apiKey).toBeUndefined()
    expect(profileData.secret).toBeUndefined()

    // Test data masking in UI
    const maskedElements = await page.locator('[data-testid*="masked"]').all()
    for (const element of maskedElements) {
      const text = await element.textContent()
      expect(text).toMatch(/\*+/, 'Sensitive data should be masked')
    }
  })

  test('should implement CSRF protection', async ({ page }) => {
    // Login to get session
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password')
    await page.click('[data-testid="login-btn"]')

    // Get CSRF token
    const csrfToken = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="csrf-token"]')
      return meta?.getAttribute('content')
    })

    expect(csrfToken).toBeDefined()
    expect(csrfToken?.length).toBeGreaterThan(20)

    // Test form submission with CSRF token
    await page.goto('/profiles')
    await page.click('[data-testid="create-profile-btn"]')
    await page.fill('[data-testid="profile-name-input"]', 'CSRF Test')
    
    // Verify CSRF token is included in form
    const csrfInput = await page.locator('input[name="csrf_token"]')
    await expect(csrfInput).toHaveValue(csrfToken!)

    await page.click('[data-testid="save-profile-btn"]')
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()

    // Test CSRF protection on API endpoints
    const maliciousRequest = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/profiles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Malicious Profile',
            csrf_token: 'invalid_token'
          })
        })
        return {
          status: response.status,
          data: await response.json()
        }
      } catch (error) {
        return { error: error.message }
      }
    })

    expect(maliciousRequest.status).toBe(403)
    expect(maliciousRequest.data.error).toContain('CSRF')
  })

  test('should implement rate limiting', async ({ page }) => {
    // Test login rate limiting
    for (let i = 0; i < 5; i++) {
      await page.goto('/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'wrongpassword')
      await page.click('[data-testid="login-btn"]')
      await page.waitForTimeout(100)
    }

    // Should show rate limiting message
    await expect(page.locator('[data-testid="rate-limit-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="rate-limit-message"]')).toContainText('too many attempts')

    // Test API rate limiting
    const rateLimitResponses = []
    for (let i = 0; i < 10; i++) {
      const response = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/test/rate-limit')
          return response.status
        } catch (error) {
          return 500
        }
      })
      rateLimitResponses.push(response)
      await page.waitForTimeout(50)
    }

    // Should eventually return 429 Too Many Requests
    expect(rateLimitResponses).toContain(429)
  })

  test('should secure cookies and sessions', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password')
    await page.click('[data-testid="login-btn"]')

    const cookies = await page.context().cookies()
    
    // Check security attributes
    cookies.forEach(cookie => {
      if (cookie.name === 'session' || cookie.name === 'auth') {
        expect(cookie.httpOnly).toBe(true)
        expect(cookie.secure).toBe(true)
        expect(cookie.sameSite).toBe('Strict')
      }
    })

    // Test session expiration
    await page.evaluate(() => {
      // Simulate session expiration
      document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    })

    await page.reload()
    
    // Should redirect to login
    await expect(page).toHaveURL('/login')
    await expect(page.locator('[data-testid="session-expired"]')).toBeVisible()
  })

  test('should prevent clickjacking', async ({ page }) => {
    // Test X-Frame-Options header
    const response = await page.goto('/')
    if (response) {
      const headers = response.headers()
      expect(headers['x-frame-options']).toBe('DENY')
    }

    // Test CSP frame-ancestors
    const cspHeader = await page.evaluate(() => {
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
      return meta?.getAttribute('content')
    })

    if (cspHeader) {
      expect(cspHeader).toContain("frame-ancestors 'none'")
    }
  })

  test('should implement secure file uploads', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password')
    await page.click('[data-testid="login-btn"]')

    await page.goto('/processing')

    // Test file type validation
    const maliciousFiles = [
      { name: 'malicious.exe', mimeType: 'application/octet-stream' },
      { name: 'script.php', mimeType: 'application/x-php' },
      { name: 'exploit.js', mimeType: 'application/javascript' },
    ]

    for (const file of maliciousFiles) {
      // Create file input
      const fileInput = page.locator('[data-testid="audio-upload"]')
      
      // Try to upload malicious file
      await fileInput.setInputFiles({
        name: file.name,
        mimeType: file.mimeType,
        buffer: Buffer.from('malicious content')
      })

      // Should show error
      await expect(page.locator('[data-testid="file-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="file-error"]')).toContainText('Invalid file type')
    }

    // Test file size validation
    const largeFile = {
      name: 'large.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.alloc(200 * 1024 * 1024) // 200MB
    }

    await page.locator('[data-testid="audio-upload"]').setInputFiles(largeFile)
    await expect(page.locator('[data-testid="file-error"]')).toContainText('File too large')
  })

  test('should implement proper logging and monitoring', async ({ page }) => {
    // Simulate security events
    await page.goto('/login')
    
    // Failed login attempts
    for (let i = 0; i < 3; i++) {
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'wrongpassword')
      await page.click('[data-testid="login-btn"]')
      await page.waitForTimeout(100)
    }

    // Check if security events were logged
    const securityLogs = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/logs/security')
        const logs = await response.json()
        return logs.filter((log: any) => log.level === 'security')
      } catch (error) {
        return []
      }
    })

    expect(securityLogs.length).toBeGreaterThan(0)
    
    const failedLoginLogs = securityLogs.filter((log: any) => 
      log.event === 'failed_login' && log.email === 'test@example.com'
    )
    expect(failedLoginLogs.length).toBe(3)

    // Test security monitoring
    const securityStatus = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/security/status')
        return await response.json()
      } catch (error) {
        return { error: error.message }
      }
    })

    expect(securityStatus.error).not.toBeDefined()
    expect(securityStatus.threats).toBeDefined()
    expect(securityStatus.anomalies).toBeDefined()
  })

  test('should handle content security policy', async ({ page }) => {
    await page.goto('/')

    // Test CSP violations
    const cspViolations = await page.evaluate(() => {
      return new Promise((resolve) => {
        const violations: any[] = []
        
        // Listen for CSP violations
        document.addEventListener('securitypolicyviolation', (event) => {
          violations.push({
            blockedURI: event.blockedURI,
            violatedDirective: event.violatedDirective,
            originalPolicy: event.originalPolicy,
          })
        })

        // Try to violate CSP
        setTimeout(() => {
          const script = document.createElement('script')
          script.src = 'javascript:alert("CSP violation")'
          document.head.appendChild(script)

          setTimeout(() => resolve(violations), 1000)
        }, 100)
      })
    })

    // CSP violations should be detected and blocked
    const scriptViolations = cspViolations.filter(v => v.violatedDirective.includes('script-src'))
    expect(scriptViolations.length).toBeGreaterThan(0)

    // Test inline script restrictions
    const inlineScriptBlocked = await page.evaluate(() => {
      try {
        eval('alert("Inline script")')
        return false // If executed, CSP is not working
      } catch (error) {
        return true // Blocked as expected
      }
    })

    expect(inlineScriptBlocked).toBe(true)
  })

  test('should implement proper HTTPS security', async ({ page }) => {
    // Test HTTPS redirect
    await page.goto('http://localhost:3000')
    await expect(page).toHaveURL(/https:\/\//)

    // Test HSTS header
    const response = await page.goto('/')
    if (response) {
      const headers = response.headers()
      expect(headers['strict-transport-security']).toMatch(/max-age=\d+.*includeSubDomains/)
    }

    // Test mixed content prevention
    const mixedContentTest = await page.evaluate(() => {
      return new Promise((resolve) => {
        const img = document.createElement('img')
        img.src = 'http://insecure.example.com/test.jpg'
        img.onload = () => resolve(false) // Loaded - mixed content allowed
        img.onerror = () => resolve(true)  // Blocked - mixed content prevented
        document.body.appendChild(img)
      })
    })

    expect(mixedContentTest).toBe(true) // Mixed content should be blocked
  })

  test('should protect against information disclosure', async ({ page }) => {
    // Test error messages don't reveal sensitive information
    await page.goto('/non-existent-page')
    const errorMessage = await page.locator('[data-testid="error-message"]').textContent()
    expect(errorMessage).not.toContain('stack trace')
    expect(errorMessage).not.toContain('internal path')
    expect(errorMessage).not.toContain('database')

    // Test API error responses
    const apiError = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/non-existent-endpoint')
        const error = await response.json()
        return error
      } catch (error) {
        return { message: error.message }
      }
    })

    expect(apiError.stack).toBeUndefined()
    expect(apiError.internal).toBeUndefined()
    expect(apiError.database).toBeUndefined()

    // Test directory traversal protection
    const traversalAttempts = [
      '/api/../../../etc/passwd',
      '/api/..\\..\\..\\windows\\system32\\config\\sam',
      '/api/%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    ]

    for (const attempt of traversalAttempts) {
      const response = await page.evaluate(async (url) => {
        try {
          const response = await fetch(url)
          return response.status
        } catch (error) {
          return 500
        }
      }, attempt)

      expect(response).toBe(404) // Should not reveal directory contents
    }
  })
})