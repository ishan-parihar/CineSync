describe('LipSyncAutomation Core User Flows', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.runAccessibilityAudit()
  })

  describe('Application Performance', () => {
    it('should meet performance budgets on initial load', () => {
      cy.checkPerformanceBudgets()
      cy.measureCoreWebVitals().should((vitals) => {
        expect(vitals.LCP).to.be.lt(2500)
        expect(vitals.FID).to.be.lt(100)
        expect(vitals.CLS).to.be.lt(0.1)
      })
    })

    it('should maintain performance during navigation', () => {
      const pages = ['/', '/profiles', '/process', '/cinematography', '/visualizations']
      
      pages.forEach((page) => {
        cy.visit(page)
        cy.waitForLoading()
        cy.measurePageLoad().then((metrics) => {
          expect(metrics.firstContentfulPaint).to.be.lt(2000)
        })
      })
    })

    it('should handle large datasets efficiently', () => {
      cy.navigateTo('visualizations')
      cy.testLargeDatasetPerformance(1000)
      cy.measureMemoryUsage().then((memory) => {
        if (memory) {
          const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024)
          expect(usedMB).to.be.lt(50)
        }
      })
    })

    it('should not have memory leaks during extended use', () => {
      cy.navigateTo('process')
      cy.checkMemoryLeaks(50)
    })
  })

  describe('Accessibility Compliance', () => {
    it('should be fully accessible on all pages', () => {
      const pages = ['/', '/profiles', '/process', '/cinematography', '/visualizations']
      
      pages.forEach((page) => {
        cy.visit(page)
        cy.checkA11y()
        cy.checkKeyboardNavigation()
      })
    })

    it('should maintain accessibility during dynamic content changes', () => {
      cy.navigateTo('profiles')
      cy.createProfile({
        name: 'Test Profile',
        description: 'Test accessibility with dynamic content'
      })
      cy.checkComponentA11y('[data-testid="profile-list"]')
      cy.checkScreenReaderAnnouncement('Profile created')
    })

    it('should handle focus management correctly', () => {
      cy.navigateTo('process')
      cy.get('[data-testid="upload-button"]').click()
      cy.checkFocusManagement('[data-testid="file-input"]')
    })
  })

  describe('Profile Management Flow', () => {
    it('should create, edit, and delete profiles efficiently', () => {
      cy.navigateTo('profiles')
      
      // Create profile
      const profileData = {
        name: 'Performance Test Profile',
        description: 'Testing profile creation performance'
      }
      
      cy.measureComponentRender('[data-testid="profile-form"]').then((metrics) => {
        expect(metrics.renderTime).to.be.lt(100)
      })
      
      cy.createProfile(profileData)
      cy.selectProfile(profileData.name)
      
      // Edit profile
      cy.get('[data-testid="edit-profile-button"]').click()
      cy.get('[data-testid="profile-name-input"]').clear().type('Updated Profile')
      cy.get('[data-testid="save-profile-button"]').click()
      
      // Delete profile
      cy.get('[data-testid="delete-profile-button"]').click()
      cy.get('[data-testid="confirm-delete"]').click()
      
      cy.shouldNotHaveErrors()
    })

    it('should handle profile selection performance', () => {
      cy.navigateTo('profiles')
      
      // Create multiple profiles
      for (let i = 0; i < 10; i++) {
        cy.createProfile({
          name: `Profile ${i}`,
          description: `Test profile ${i}`
        })
      }
      
      // Test selection performance
      cy.measureComponentRender('[data-testid="profile-selector"]').then((metrics) => {
        expect(metrics.renderTime).to.be.lt(50)
      })
    })
  })

  describe('Processing Workflow', () => {
    it('should handle audio upload and processing efficiently', () => {
      cy.navigateTo('process')
      
      // Upload file
      cy.uploadFile('test-audio.mp3')
      cy.startProcessing()
      
      // Monitor processing performance
      cy.measureComponentRender('[data-testid="processing-stages"]').then((metrics) => {
        expect(metrics.renderTime).to.be.lt(100)
      })
      
      cy.waitForWebSocketConnection()
      cy.waitForProcessing()
      
      // Check results
      cy.get('[data-testid="processing-results"]').should('be.visible')
      cy.checkComponentA11y('[data-testid="processing-results"]')
    })

    it('should handle batch processing efficiently', () => {
      cy.navigateTo('batch')
      
      // Add multiple files to queue
      for (let i = 0; i < 5; i++) {
        cy.uploadFile(`test-audio-${i}.mp3`)
        cy.get('[data-testid="add-to-queue"]').click()
      }
      
      // Start batch processing
      cy.get('[data-testid="start-batch-processing"]').click()
      
      // Monitor queue performance
      cy.measureComponentRender('[data-testid="batch-queue"]').then((metrics) => {
        expect(metrics.renderTime).to.be.lt(200)
      })
      
      cy.waitForProcessing(120000) // 2 minutes for batch
    })
  })

  describe('Cinematography Features', () => {
    it('should render shot sequences efficiently', () => {
      cy.navigateTo('cinematography')
      
      // Configure shot settings
      cy.get('[data-testid="shot-type-selector"]').select('Close-up')
      cy.get('[data-testid="emotion-selector"]').select('Happy')
      cy.get('[data-testid="generate-shots"]').click()
      
      // Measure rendering performance
      cy.measureComponentRender('[data-testid="shot-sequence"]').then((metrics) => {
        expect(metrics.renderTime).to.be.lt(150)
      })
      
      // Check accessibility
      cy.checkCinematographyAccessibility()
    })

    it('should handle real-time shot preview', () => {
      cy.navigateTo('cinematography')
      
      // Enable real-time preview
      cy.get('[data-testid="realtime-preview-toggle"]').click()
      
      // Test animation performance
      cy.measureAnimationPerformance('[data-testid="shot-preview"]').then((metrics) => {
        expect(metrics.frameRate).to.be.gte(30)
        expect(metrics.droppedFrames).to.be.lt(5)
      })
    })
  })

  describe('Data Visualizations', () => {
    it('should render emotion heatmaps efficiently', () => {
      cy.navigateTo('visualizations')
      cy.get('[data-testid="emotion-heatmap-tab"]').click()
      
      cy.measureComponentRender('[data-testid="emotion-heatmap"]').then((metrics) => {
        expect(metrics.renderTime).to.be.lt(300)
      })
      
      cy.checkVisualizationAccessibility()
    })

    it('should handle interactive timeline performance', () => {
      cy.navigateTo('visualizations')
      cy.get('[data-testid="timeline-tab"]').click()
      
      // Test interaction performance
      cy.get('[data-testid="timeline-play-button"]').click()
      cy.measureAnimationPerformance('[data-testid="emotion-timeline"]').then((metrics) => {
        expect(metrics.frameRate).to.be.gte(25)
      })
    })

    it('should handle large dataset visualizations', () => {
      cy.navigateTo('visualizations')
      
      // Load large dataset
      cy.get('[data-testid="load-large-dataset"]').click()
      cy.waitForLoading()
      
      // Test performance with large data
      cy.testLargeDatasetPerformance(5000)
      cy.checkColorContrast('[data-testid="chart-legend"]')
    })
  })

  describe('WebSocket Real-time Features', () => {
    it('should maintain WebSocket connection performance', () => {
      cy.visit('/')
      cy.waitForWebSocketConnection()
      
      // Test message handling performance
      cy.window().then((win) => {
        const startTime = win.performance.now()
        
        // Simulate receiving multiple messages
        for (let i = 0; i < 100; i++) {
          win.postMessage({
            type: 'websocket-message',
            data: { id: i, message: `Test message ${i}` }
          }, '*')
        }
        
        const endTime = win.performance.now()
        const processingTime = endTime - startTime
        
        expect(processingTime).to.be.lt(1000) // Should process 100 messages in < 1s
      })
    })

    it('should handle connection failures gracefully', () => {
      cy.visit('/')
      
      // Simulate connection failure
      cy.window().then((win) => {
        win.WebSocket = jest.fn().mockImplementation(() => {
          setTimeout(() => {
            throw new Error('Connection failed')
          }, 100)
        })
      })
      
      cy.waitForWebSocketMessage('connection-error', 5000)
      cy.get('[data-testid="error-toast"]').should('be.visible')
      cy.checkAriaLabel('[data-testid="error-toast"]', 'Connection Error')
    })
  })

  describe('Responsive Design Performance', () => {
    const breakpoints = [
      { width: 320, height: 568, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1024, height: 768, name: 'Desktop Small' },
      { width: 1920, height: 1080, name: 'Desktop Large' },
    ]

    breakpoints.forEach(({ width, height, name }) => {
      it(`should perform well on ${name} (${width}x${height})`, () => {
        cy.viewport(width, height)
        cy.visit('/')
        cy.testResponsive(breakpoints)
        cy.measurePageLoad().then((metrics) => {
          expect(metrics.firstContentfulPaint).to.be.lt(3000)
        })
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', () => {
      cy.visit('/profiles')
      
      // Simulate network error
      cy.intercept('GET', '/api/profiles', { forceNetworkError: true }).as('networkError')
      cy.reload()
      
      cy.wait('@networkError')
      cy.get('[data-testid="error-message"]').should('be.visible')
      cy.checkAriaLabel('[data-testid="error-message"]', 'Network Error')
      
      // Test retry functionality
      cy.get('[data-testid="retry-button"]').click()
      cy.shouldNotHaveErrors()
    })

    it('should maintain performance during error states', () => {
      cy.visit('/process')
      
      // Simulate processing error
      cy.intercept('POST', '/api/process', { statusCode: 500 }).as('processError')
      cy.uploadFile('test-audio.mp3')
      cy.startProcessing()
      
      cy.wait('@processError')
      cy.get('[data-testid="error-message"]').should('be.visible')
      
      // Ensure error handling doesn't impact performance
      cy.measurePageLoad().then((metrics) => {
        expect(metrics.firstContentfulPaint).to.be.lt(2000)
      })
    })
  })

  describe('Dark Mode Performance', () => {
    it('should maintain performance in dark mode', () => {
      cy.visit('/')
      cy.toggleDarkMode()
      
      cy.measurePageLoad().then((metrics) => {
        expect(metrics.firstContentfulPaint).to.be.lt(2000)
      })
      
      cy.checkA11y() // Ensure accessibility in dark mode
    })
  })

  describe('Security and Privacy', () => {
    it('should not leak sensitive information', () => {
      cy.visit('/profiles')
      
      // Check for console errors or leaks
      cy.window().then((win) => {
        const originalError = win.console.error
        const errors = []
        
        win.console.error = (...args) => {
          errors.push(args.join(' '))
          originalError.apply(win.console, args)
        }
        
        // Trigger potential errors
        cy.get('[data-testid="profile-selector"]').click()
        cy.get('[data-testid="invalid-action"]').click()
        
        cy.then(() => {
          // Check for any sensitive information in errors
          errors.forEach(error => {
            expect(error).not.to.include('password')
            expect(error).not.to.include('token')
            expect(error).not.to.include('secret')
          })
          
          win.console.error = originalError
        })
      })
    })
  })
})