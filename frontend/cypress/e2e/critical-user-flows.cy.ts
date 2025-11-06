describe('Critical User Flows E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.login('test@example.com', 'password')
  })

  context('Complete User Onboarding Flow', () => {
    it('should guide new user through complete onboarding', () => {
      // First-time user should see onboarding
      cy.get('[data-testid="onboarding-welcome"]').should('be.visible')
      cy.get('[data-testid="onboarding-title"]').should('contain', 'Welcome to LipSync Automation')

      // Step 1: Create first profile
      cy.get('[data-testid="onboarding-next"]').click()
      cy.get('[data-testid="onboarding-step-1"]').should('contain', 'Create Your First Character Profile')

      cy.get('[data-testid="profile-name-input"]').type('My First Character')
      cy.get('[data-testid="emotion-selector"]').within(() => {
        cy.get('[data-value="happy"]').click()
        cy.get('[data-value="sad"]').click()
      })
      cy.get('[data-testid="angle-selector"]').within(() => {
        cy.get('[data-value="CU"]').click()
        cy.get('[data-value="MS"]').click()
      })

      cy.get('[data-testid="create-profile-btn"]').click()
      cy.get('[data-testid="onboarding-next"]').click()

      // Step 2: Upload first audio
      cy.get('[data-testid="onboarding-step-2"]').should('contain', 'Upload Your First Audio')

      cy.get('[data-testid="audio-upload"]').attachFile('welcome-audio.mp3')
      cy.get('[data-testid="profile-selector"]').select('My First Character')
      cy.get('[data-testid="start-processing-btn"]').click()

      // Wait for processing to complete
      cy.simulateProcessingStages([
        { stage: 'Audio Analysis', progress: 100, duration: 1000 },
        { stage: 'Emotion Detection', progress: 100, duration: 1000 },
        { stage: 'Shot Selection', progress: 100, duration: 1000 },
        { stage: 'Video Generation', progress: 100, duration: 1000 },
      ])

      cy.get('[data-testid="onboarding-next"]').click()

      // Step 3: Explore results
      cy.get('[data-testid="onboarding-step-3"]').should('contain', 'Explore Your Results')

      cy.get('[data-testid="results-preview"]').should('be.visible')
      cy.get('[data-testid="emotion-results"]').should('be.visible')
      cy.get('[data-testid="shot-list"]').should('be.visible')

      cy.get('[data-testid="onboarding-next"]').click()

      // Step 4: Complete onboarding
      cy.get('[data-testid="onboarding-complete"]').should('contain', 'Setup Complete!')
      cy.get('[data-testid="go-to-dashboard"]').click()

      // Verify user is in dashboard with their data
      cy.get('[data-testid="dashboard"]').should('be.visible')
      cy.get('[data-testid="recent-profiles"]').should('contain', 'My First Character')
      cy.get('[data-testid="recent-processing"]').should('contain', 'welcome-audio.mp3')

      // Onboarding should not show again
      cy.reload()
      cy.get('[data-testid="onboarding-welcome"]').should('not.exist')
    })

    it('should allow skipping onboarding', () => {
      cy.get('[data-testid="onboarding-welcome"]').should('be.visible')
      cy.get('[data-testid="skip-onboarding"]').click()

      cy.get('[data-testid="skip-confirmation"]').should('be.visible')
      cy.get('[data-testid="confirm-skip"]').click()

      // Should go directly to dashboard
      cy.get('[data-testid="dashboard"]').should('be.visible')
    })
  })

  context('Complete Profile to Video Workflow', () => {
    beforeEach(() => {
      // Create comprehensive test profile
      cy.createTestProfile({
        name: 'Workflow Test Character',
        emotions: ['happy', 'sad', 'angry', 'surprised'],
        angles: ['CU', 'ECU', 'MS', 'LS'],
        cinematography: {
          style: 'dramatic',
          tension: 75,
          pacing: 'dynamic'
        }
      })
    })

    it('should complete full workflow from profile creation to video generation', () => {
      // Step 1: Create detailed profile
      cy.get('[data-testid="nav-profiles"]').click()
      cy.get('[data-testid="create-profile-btn"]').click()

      cy.get('[data-testid="profile-name-input"]').type('Complex Character')
      cy.get('[data-testid="profile-description-input"]').type('A complex character with multiple emotions')

      // Configure all emotions
      cy.get('[data-testid="emotion-selector"]').within(() => {
        cy.get('[data-value="happy"]').click()
        cy.get('[data-value="sad"]').click()
        cy.get('[data-value="angry"]').click()
        cy.get('[data-value="surprised"]').click()
      })

      // Configure all angles
      cy.get('[data-testid="angle-selector"]').within(() => {
        cy.get('[data-value="CU"]').click()
        cy.get('[data-value="ECU"]').click()
        cy.get('[data-value="MS"]').click()
        cy.get('[data-value="LS"]').click()
      })

      // Upload profile image
      cy.get('[data-testid="profile-image-upload"]').attachFile('character-photo.jpg')

      // Configure viseme mappings
      cy.get('[data-testid="viseme-mapping-tab"]').click()
      cy.get('[data-testid="add-viseme-btn"]').click()
      cy.get('[data-testid="viseme-input"]').type('AA')
      cy.get('[data-testid="audio-file-input"]').attachFile('viseme-AA.wav')
      cy.get('[data-testid="save-viseme-btn"]').click()

      // Configure cinematography
      cy.get('[data-testid="cinematography-tab"]').click()
      cy.get('[data-testid="shot-style-selector"]').select('dramatic')
      cy.get('[data-testid="tension-slider"]').invoke('val', 75).trigger('change')
      cy.get('[data-testid="pacing-selector"]').select('dynamic')

      cy.get('[data-testid="save-profile-btn"]').click()
      cy.get('[data-testid="success-message"]').should('contain', 'Profile created successfully')

      // Step 2: Upload and process complex audio
      cy.get('[data-testid="nav-processing"]').click()

      cy.get('[data-testid="audio-upload"]').attachFile('complex-dialogue.mp3')
      cy.get('[data-testid="profile-selector"]').select('Complex Character')

      // Configure advanced processing
      cy.get('[data-testid="advanced-settings"]').click()
      cy.get('[data-testid="enable-emotion-detection"]').check()
      cy.get('[data-testid="enable-shot-generation"]').check()
      cy.get('[data-testid="enable-viseme-mapping"]').check()
      cy.get('[data-testid="emotion-sensitivity-slider"]').invoke('val', 85).trigger('change')
      cy.get('[data-testid="shot-tension-slider"]').invoke('val', 70).trigger('change')

      cy.get('[data-testid="start-processing-btn"]').click()

      // Monitor processing with real-time updates
      cy.simulateProcessingStages([
        { stage: 'Audio Analysis', progress: 25, duration: 2000 },
        { stage: 'Emotion Detection', progress: 50, duration: 3000 },
        { stage: 'Shot Selection', progress: 75, duration: 2500 },
        { stage: 'Viseme Mapping', progress: 90, duration: 2000 },
        { stage: 'Video Generation', progress: 100, duration: 5000 },
      ])

      // Step 3: Review and customize results
      cy.get('[data-testid="processing-complete"]').should('be.visible')
      cy.get('[data-testid="review-results-btn"]').click()

      // Review emotion analysis
      cy.get('[data-testid="emotion-analysis"]').within(() => {
        cy.get('[data-testid="emotion-timeline"]').should('be.visible')
        cy.get('[data-testid="emotion-intensity-chart"]').should('be.visible')

        // Adjust emotion detection if needed
        cy.get('[data-testid="adjust-emotions-btn"]').click()
        cy.get('[data-testid="emotion-threshold-slider"]').invoke('val', 70).trigger('change')
        cy.get('[data-testid="apply-adjustments"]').click()
      })

      // Review shot list
      cy.get('[data-testid="shot-list"]').within(() => {
        cy.get('[data-testid="shot-item"]').should('have.length.greaterThan', 0)

        // Customize specific shots
        cy.get('[data-testid="shot-item"]').eq(2).within(() => {
          cy.get('[data-testid="edit-shot-btn"]').click()
          cy.get('[data-testid="shot-angle-selector"]').select('ECU')
          cy.get('[data-testid="shot-duration-input"]').clear().type('2.5')
          cy.get('[data-testid="save-shot-btn"]').click()
        })
      })

      // Review viseme mapping
      cy.get('[data-testid="viseme-mapping"]').within(() => {
        cy.get('[data-testid="viseme-timeline"]').should('be.visible')

        // Fine-tune viseme timing
        cy.get('[data-testid="viseme-item"]').eq(5).within(() => {
          cy.get('[data-testid="edit-viseme-btn"]').click()
          cy.get('[data-testid="viseme-timing-input"]').clear().type('1.25')
          cy.get('[data-testid="save-viseme-timing"]').click()
        })
      })

      // Step 4: Generate final video
      cy.get('[data-testid="generate-video-btn"]').click()

      // Configure video output settings
      cy.get('[data-testid="video-settings"]').within(() => {
        cy.get('[data-testid="resolution-selector"]').select('1080p')
        cy.get('[data-testid="frame-rate-selector"]').select('30')
        cy.get('[data-testid="format-selector"]').select('MP4')
        cy.get('[data-testid="quality-slider"]').invoke('val', 90).trigger('change')
      })

      cy.get('[data-testid="start-video-generation"]').click()

      // Monitor video generation progress
      cy.simulateVideoGeneration([
        { stage: 'Preparing Assets', progress: 20, duration: 2000 },
        { stage: 'Rendering Frames', progress: 60, duration: 8000 },
        { stage: 'Encoding Video', progress: 90, duration: 3000 },
        { stage: 'Finalizing', progress: 100, duration: 1000 },
      ])

      // Step 5: Preview and download final video
      cy.get('[data-testid="video-generation-complete"]').should('be.visible')
      cy.get('[data-testid="video-preview"]').should('be.visible')

      // Play preview
      cy.get('[data-testid="play-preview-btn"]').click()
      cy.get('[data-testid="video-player"]').should('be.visible')

      // Download final video
      cy.intercept('GET', '/api/download/video/*', { fixture: 'final-video.mp4' }).as('downloadVideo')
      cy.get('[data-testid="download-video-btn"]').click()
      cy.wait('@downloadVideo')

      // Verify download
      cy.readFile('cypress/downloads/final-video.mp4').should('exist')

      // Step 6: Save project and create new version
      cy.get('[data-testid="save-project-btn"]').click()
      cy.get('[data-testid="project-name-input"]').type('My First Animation Project')
      cy.get('[data-testid="save-project-confirm"]').click()

      cy.get('[data-testid="success-message"]').should('contain', 'Project saved successfully')

      // Create variation
      cy.get('[data-testid="create-variation-btn"]').click()
      cy.get('[data-testid="variation-settings"]').within(() => {
        cy.get('[data-testid="variation-profile-selector"]').select('Workflow Test Character')
        cy.get('[data-testid="variation-style-selector"]').select('comedy')
      })

      cy.get('[data-testid="generate-variation"]').click()

      // Verify variation is created
      cy.get('[data-testid="variation-processing"]').should('be.visible')
    })
  })

  context('Batch Processing Workflow', () => {
    beforeEach(() => {
      // Create multiple profiles for batch processing
      cy.createTestProfile({ name: 'Batch Character 1', emotions: ['happy'], angles: ['CU'] })
      cy.createTestProfile({ name: 'Batch Character 2', emotions: ['sad'], angles: ['MS'] })
      cy.createTestProfile({ name: 'Batch Character 3', emotions: ['angry'], angles: ['LS'] })
    })

    it('should handle complete batch processing workflow', () => {
      // Navigate to batch processing
      cy.get('[data-testid="nav-processing"]').click()
      cy.get('[data-testid="batch-processing-tab"]').click()

      // Step 1: Upload multiple audio files
      const audioFiles = [
        'batch-audio-1.mp3',
        'batch-audio-2.mp3',
        'batch-audio-3.mp3',
        'batch-audio-4.mp3',
        'batch-audio-5.mp3'
      ]

      audioFiles.forEach((file, index) => {
        cy.get('[data-testid="add-file-btn"]').click()
        cy.get(`[data-testid="file-input-${index}"]`).attachFile(file)
      })

      // Verify queue
      cy.get('[data-testid="queue-item"]').should('have.length', 5)

      // Step 2: Configure batch settings
      cy.get('[data-testid="batch-settings"]').within(() => {
        cy.get('[data-testid="apply-same-profile"]').check()
        cy.get('[data-testid="batch-profile-selector"]').select('Batch Character 1')
        cy.get('[data-testid="batch-processing-mode"]').select('parallel')
        cy.get('[data-testid="max-concurrent-input"]').clear().type('3')
        cy.get('[data-testid="enable-batch-emotion-detection"]').check()
        cy.get('[data-testid="enable-batch-shot-generation"]').check()
      })

      // Step 3: Configure output settings
      cy.get('[data-testid="batch-output-settings"]').within(() => {
        cy.get('[data-testid="output-format-selector"]').select('MP4')
        cy.get('[data-testid="output-resolution-selector"]').select('720p')
        cy.get('[data-testid="create-individual-videos"]').check()
        cy.get('[data-testid="create-compilation-video"]').check()
        cy.get('[data-testid="generate-reports"]').check()
      })

      // Step 4: Start batch processing
      cy.get('[data-testid="start-batch-btn"]').click()

      // Monitor batch progress
      cy.simulateBatchProcessing([
        { file: 'batch-audio-1.mp3', progress: 100, status: 'completed', duration: 3000 },
        { file: 'batch-audio-2.mp3', progress: 100, status: 'completed', duration: 3500 },
        { file: 'batch-audio-3.mp3', progress: 100, status: 'completed', duration: 3200 },
        { file: 'batch-audio-4.mp3', progress: 100, status: 'completed', duration: 2800 },
        { file: 'batch-audio-5.mp3', progress: 100, status: 'completed', duration: 4000 },
      ])

      // Step 5: Review batch results
      cy.get('[data-testid="batch-complete"]').should('be.visible')
      cy.get('[data-testid="batch-summary"]').within(() => {
        cy.get('[data-testid="total-processed"]').should('contain', '5')
        cy.get('[data-testid="successful"]').should('contain', '5')
        cy.get('[data-testid="failed"]').should('contain', '0')
        cy.get('[data-testid="total-processing-time"]').should('be.visible')
      })

      // Download individual results
      cy.get('[data-testid="download-individual-btn"]').click()
      cy.get('[data-testid="download-compilation-btn"]').click()
      cy.get('[data-testid="download-reports-btn"]').click()

      // Verify downloads
      cy.readFile('cypress/downloads/batch-individual.zip').should('exist')
      cy.readFile('cypress/downloads/batch-compilation.mp4').should('exist')
      cy.readFile('cypress/downloads/batch-reports.pdf').should('exist')

      // Step 6: Save batch project
      cy.get('[data-testid="save-batch-project"]').click()
      cy.get('[data-testid="project-name-input"]').type('Batch Processing Project')
      cy.get('[data-testid="save-project-confirm"]').click()

      cy.get('[data-testid="success-message"]').should('contain', 'Batch project saved')
    })
  })

  context('System Monitoring and Management Workflow', () => {
    it('should provide complete system monitoring experience', () => {
      // Navigate to system monitoring
      cy.get('[data-testid="nav-monitoring"]').click()

      // Verify system dashboard
      cy.get('[data-testid="system-dashboard"]').should('be.visible')
      cy.get('[data-testid="system-overview"]').should('be.visible')

      // Check system health indicators
      cy.get('[data-testid="system-health"]').within(() => {
        cy.get('[data-testid="cpu-usage"]').should('be.visible')
        cy.get('[data-testid="memory-usage"]').should('be.visible')
        cy.get('[data-testid="disk-usage"]').should('be.visible')
        cy.get('[data-testid="network-status"]').should('be.visible')
      })

      // Monitor active processes
      cy.get('[data-testid="active-processes"]').should('be.visible')
      cy.get('[data-testid="process-item"]').should('have.length.greaterThan', 0)

      // Check queue status
      cy.get('[data-testid="queue-status"]').should('be.visible')
      cy.get('[data-testid="queue-size"]').should('be.visible')
      cy.get('[data-testid="estimated-wait-time"]').should('be.visible')

      // View performance metrics
      cy.get('[data-testid="performance-metrics"]').click()
      cy.get('[data-testid="performance-charts"]').should('be.visible')

      // Check response times
      cy.get('[data-testid="response-time-chart"]').should('be.visible')
      cy.get('[data-testid="throughput-chart"]').should('be.visible')
      cy.get('[data-testid="error-rate-chart"]').should('be.visible')

      // View system logs
      cy.get('[data-testid="system-logs"]').click()
      cy.get('[data-testid="log-viewer"]').should('be.visible')

      // Filter logs
      cy.get('[data-testid="log-level-filter"]').select('ERROR')
      cy.get('[data-testid="log-source-filter"]').select('processing')
      cy.get('[data-testid="apply-log-filter"]').click()

      // Verify filtered logs
      cy.get('[data-testid="log-entry"]').should('have.length.greaterThan', 0)
      cy.get('[data-testid="log-entry"]').each(($entry) => {
        cy.wrap($entry).should('contain', 'ERROR')
        cy.wrap($entry).should('contain', 'processing')
      })

      // Check system alerts
      cy.get('[data-testid="system-alerts"]').click()
      cy.get('[data-testid="alerts-list"]').should('be.visible')

      // Create test alert
      cy.get('[data-testid="create-alert-btn"]').click()
      cy.get('[data-testid="alert-name-input"]').type('High CPU Usage Alert')
      cy.get('[data-testid="alert-metric-selector"]').select('cpu')
      cy.get('[data-testid="alert-threshold-input"]').clear().type('80')
      cy.get('[data-testid="alert-notification-email"]').type('admin@example.com')
      cy.get('[data-testid="save-alert-btn"]').click()

      // Verify alert is created
      cy.get('[data-testid="alert-item"]').should('contain', 'High CPU Usage Alert')

      // Test alert triggers
      cy.simulateHighCpuUsage()
      cy.get('[data-testid="alert-triggered"]').should('contain', 'High CPU Usage Alert triggered')

      // Manage system settings
      cy.get('[data-testid="system-settings"]').click()
      cy.get('[data-testid="settings-panel"]').should('be.visible')

      // Adjust performance settings
      cy.get('[data-testid="performance-settings"]').within(() => {
        cy.get('[data-testid="max-concurrent-processes-input"]').clear().type('5')
        cy.get('[data-testid="process-timeout-input"]').clear().type('300')
        cy.get('[data-testid="enable-auto-cleanup"]').check()
      })

      // Save settings
      cy.get('[data-testid="save-settings-btn"]').click()
      cy.get('[data-testid="success-message"]').should('contain', 'Settings saved successfully')

      // Verify settings are applied
      cy.get('[data-testid="settings-applied"]').should('be.visible')
    })
  })

  context('Error Recovery and Support Workflow', () => {
    it('should handle errors and provide support workflow', () => {
      // Simulate processing error
      cy.get('[data-testid="nav-processing"]').click()
      cy.get('[data-testid="audio-upload"]').attachFile('problematic-audio.mp3')
      cy.get('[data-testid="profile-selector"]').select('Workflow Test Character')
      cy.get('[data-testid="start-processing-btn"]').click()

      // Simulate error
      cy.simulateProcessingError('Audio format not supported')

      // Verify error handling
      cy.get('[data-testid="error-message"]').should('contain', 'Audio format not supported')
      cy.get('[data-testid="error-details"]').should('be.visible')
      cy.get('[data-testid="error-suggestions"]').should('be.visible')

      // Try suggested solutions
      cy.get('[data-testid="try-suggestion-1"]').click()
      cy.get('[data-testid="audio-converter"]').should('be.visible')

      // Convert audio
      cy.get('[data-testid="convert-audio-btn"]').click()
      cy.get('[data-testid="conversion-progress"]').should('be.visible')

      // Retry processing
      cy.get('[data-testid="retry-processing-btn"]').click()
      cy.get('[data-testid="processing-resumed"]').should('be.visible')

      // If error persists, access support
      cy.simulateProcessingError('Processing failed again')
      cy.get('[data-testid="get-support-btn"]').click()

      // Support workflow
      cy.get('[data-testid="support-panel"]').should('be.visible')
      cy.get('[data-testid="support-options"]').should('be.visible')

      // Self-service diagnostics
      cy.get('[data-testid="run-diagnostics"]').click()
      cy.get('[data-testid="diagnostics-progress"]').should('be.visible')

      cy.get('[data-testid="diagnostics-results"]').should('be.visible')
      cy.get('[data-testid="diagnostic-item"]').should('have.length.greaterThan', 0)

      // Contact support
      cy.get('[data-testid="contact-support-btn"]').click()
      cy.get('[data-testid="support-form"]').should('be.visible')

      cy.get('[data-testid="support-subject-input"]').type('Processing Error with Audio File')
      cy.get('[data-testid="support-description-textarea"]').type('I encountered an error when processing my audio file. The error message was "Audio format not supported".')
      cy.get('[data-testid="attach-logs-checkbox"]').check()
      cy.get('[data-testid="submit-support-request"]').click()

      // Verify support request submitted
      cy.get('[data-testid="support-submitted"]').should('contain', 'Support request submitted')
      cy.get('[data-testid="ticket-number"]').should('be.visible')

      // Track support request
      cy.get('[data-testid="track-request-btn"]').click()
      cy.get('[data-testid="request-status"]').should('contain', 'Under review')
    })
  })

  context('Mobile and Responsive Workflow', () => {
    beforeEach(() => {
      cy.viewport('iphone-x')
    })

    it('should provide complete mobile experience', () => {
      // Verify mobile layout
      cy.get('[data-testid="mobile-navigation"]').should('be.visible')
      cy.get('[data-testid="mobile-menu-toggle"]').should('be.visible')

      // Navigate using mobile menu
      cy.get('[data-testid="mobile-menu-toggle"]').click()
      cy.get('[data-testid="mobile-menu"]').should('be.visible')

      cy.get('[data-testid="mobile-nav-profiles"]').click()
      cy.get('[data-testid="mobile-menu"]').should('not.exist')

      // Create profile on mobile
      cy.get('[data-testid="create-profile-btn"]').click()
      cy.get('[data-testid="mobile-profile-form"]').should('be.visible')

      cy.get('[data-testid="profile-name-input"]').type('Mobile Character')
      cy.get('[data-testid="mobile-emotion-selector"]').should('be.visible')
      cy.get('[data-testid="mobile-angle-selector"]').should('be.visible')

      // Use mobile-optimized controls
      cy.get('[data-testid="mobile-emotion-selector"]').within(() => {
        cy.get('[data-value="happy"]').click()
      })

      cy.get('[data-testid="save-profile-btn"]').click()
      cy.get('[data-testid="success-message"]').should('be.visible')

      // Process audio on mobile
      cy.get('[data-testid="mobile-menu-toggle"]').click()
      cy.get('[data-testid="mobile-nav-processing"]').click()

      cy.get('[data-testid="mobile-audio-upload"]').attachFile('mobile-test.mp3')
      cy.get('[data-testid="mobile-profile-selector"]').select('Mobile Character')
      cy.get('[data-testid="start-processing-btn"]').click()

      // Monitor mobile-optimized progress
      cy.get('[data-testid="mobile-progress-view"]').should('be.visible')
      cy.get('[data-testid="mobile-stage-indicator"]').should('be.visible')

      // View mobile results
      cy.simulateProcessingStages([
        { stage: 'Audio Analysis', progress: 100, duration: 1000 },
        { stage: 'Emotion Detection', progress: 100, duration: 1000 },
        { stage: 'Shot Selection', progress: 100, duration: 1000 },
        { stage: 'Video Generation', progress: 100, duration: 1000 },
      ])

      cy.get('[data-testid="mobile-results-view"]').should('be.visible')
      cy.get('[data-testid="mobile-results-tabs"]').should('be.visible')

      // Swipe through results (mobile gesture)
      cy.get('[data-testid="results-swiper"]').should('be.visible')
      cy.swipe('[data-testid="results-swiper"]', 'left')

      // Download on mobile
      cy.get('[data-testid="mobile-download-btn"]').click()
      cy.get('[data-testid="mobile-download-options"]').should('be.visible')

      // Verify mobile sharing options
      cy.get('[data-testid="share-results-btn"]').click()
      cy.get('[data-testid="mobile-share-sheet"]').should('be.visible')
    })
  })
})