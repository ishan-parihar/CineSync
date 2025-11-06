describe('Audio Processing E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.login('test@example.com', 'password')
    
    // Create test profile for processing
    cy.createTestProfile({
      name: 'Processing Test Character',
      emotions: ['happy', 'sad', 'angry'],
      angles: ['CU', 'MS', 'LS'],
    })
  })

  context('Single Audio Processing', () => {
    it('should process audio file successfully', () => {
      // Navigate to processing
      cy.get('[data-testid="nav-processing"]').click()
      cy.get('[data-testid="page-title"]').should('contain', 'Audio Processing')

      // Upload audio file
      cy.get('[data-testid="audio-upload"]').attachFile('test-audio.mp3')
      cy.get('[data-testid="uploaded-file"]').should('contain', 'test-audio.mp3')

      // Verify audio analysis
      cy.get('[data-testid="audio-info"]').should('be.visible')
      cy.get('[data-testid="audio-duration"]').should('contain', 'Duration:')
      cy.get('[data-testid="audio-format"]').should('contain', 'Format: MP3')

      // Select profile
      cy.get('[data-testid="profile-selector"]').select('Processing Test Character')

      // Configure processing options
      cy.get('[data-testid="processing-options"]').within(() => {
        cy.get('[data-testid="enable-emotion-detection"]').check()
        cy.get('[data-testid="enable-shot-generation"]').check()
        cy.get('[data-testid="enable-viseme-mapping"]').check()
      })

      // Advanced settings
      cy.get('[data-testid="advanced-settings"]').click()
      cy.get('[data-testid="emotion-sensitivity-slider"]').invoke('val', 75).trigger('change')
      cy.get('[data-testid="shot-tension-slider"]').invoke('val', 60).trigger('change')

      // Start processing
      cy.intercept('POST', '/api/process', { fixture: 'processing-success.json' }).as('startProcessing')
      cy.get('[data-testid="start-processing-btn"]').click()

      // Wait for processing to start
      cy.wait('@startProcessing')
      cy.get('[data-testid="processing-started"]').should('contain', 'Processing started')

      // Verify progress indicators
      cy.get('[data-testid="processing-progress"]').should('be.visible')
      cy.get('[data-testid="progress-bar"]').should('be.visible')
      cy.get('[data-testid="stage-indicators"]').should('be.visible')

      // Simulate processing stages
      cy.simulateProcessingStages([
        { stage: 'Audio Analysis', progress: 25, duration: 2000 },
        { stage: 'Emotion Detection', progress: 50, duration: 2000 },
        { stage: 'Shot Selection', progress: 75, duration: 2000 },
        { stage: 'Video Generation', progress: 100, duration: 3000 },
      ])

      // Verify completion
      cy.get('[data-testid="processing-complete"]').should('contain', 'Processing completed')
      cy.get('[data-testid="results-summary"]').should('be.visible')

      // Verify results
      cy.get('[data-testid="emotion-results"]').should('be.visible')
      cy.get('[data-testid="shot-list"]').should('be.visible')
      cy.get('[data-testid="viseme-mapping"]').should('be.visible')

      // Download results
      cy.intercept('GET', '/api/download/*', { fixture: 'results.zip' }).as('downloadResults')
      cy.get('[data-testid="download-results-btn"]').click()
      cy.wait('@downloadResults')

      // Verify download
      cy.readFile('cypress/downloads/results.zip').should('exist')
    })

    it('should handle processing errors and retry', () => {
      cy.get('[data-testid="nav-processing"]').click()

      // Upload file and start processing
      cy.get('[data-testid="audio-upload"]').attachFile('test-audio.mp3')
      cy.get('[data-testid="profile-selector"]').select('Processing Test Character')
      cy.get('[data-testid="start-processing-btn"]').click()

      // Simulate processing error
      cy.intercept('GET', '/api/processing-status/*', { 
        statusCode: 500, 
        body: { error: 'Processing failed' } 
      }).as('processingError')

      cy.wait('@processingError')
      cy.get('[data-testid="processing-error"]').should('contain', 'Processing failed')
      cy.get('[data-testid="error-details"]').should('be.visible')
      cy.get('[data-testid="retry-btn"]').should('be.visible')

      // Retry processing
      cy.intercept('GET', '/api/processing-status/*', { 
        fixture: 'processing-recovery.json' 
      }).as('processingRecovery')

      cy.get('[data-testid="retry-btn"]').click()
      cy.wait('@processingRecovery')

      // Verify recovery
      cy.get('[data-testid="processing-resumed"]').should('contain', 'Processing resumed')
      cy.get('[data-testid="processing-progress"]').should('be.visible')
    })

    it('should cancel processing successfully', () => {
      cy.get('[data-testid="nav-processing"]').click()

      // Upload file and start processing
      cy.get('[data-testid="audio-upload"]').attachFile('test-audio.mp3')
      cy.get('[data-testid="profile-selector"]').select('Processing Test Character')
      cy.get('[data-testid="start-processing-btn"]').click()

      // Cancel processing
      cy.intercept('POST', '/api/cancel-processing/*', { success: true }).as('cancelProcessing')
      cy.get('[data-testid="cancel-processing-btn"]').click()

      // Confirm cancellation
      cy.get('[data-testid="cancel-modal"]').should('be.visible')
      cy.get('[data-testid="confirm-cancel-btn"]').click()

      cy.wait('@cancelProcessing')
      cy.get('[data-testid="processing-cancelled"]').should('contain', 'Processing cancelled')

      // Verify cleanup
      cy.get('[data-testid="processing-progress"]').should('not.exist')
      cy.get('[data-testid="upload-area"]').should('be.visible')
    })

    it('should validate audio file format', () => {
      cy.get('[data-testid="nav-processing"]').click()

      // Try to upload invalid file
      cy.get('[data-testid="audio-upload"]').attachFile('invalid-file.txt')

      // Should show error
      cy.get('[data-testid="file-error"]').should('contain', 'Invalid file format')
      cy.get('[data-testid="supported-formats"]').should('contain', 'MP3, WAV, M4A')

      // Upload valid file
      cy.get('[data-testid="audio-upload"]').attachFile('test-audio.mp3')
      cy.get('[data-testid="uploaded-file"]').should('contain', 'test-audio.mp3')
    })

    it('should handle large audio files', () => {
      cy.get('[data-testid="nav-processing"]').click()

      // Upload large file
      cy.get('[data-testid="audio-upload"]').attachFile('large-audio.mp3')

      // Should show file size warning
      cy.get('[data-testid="file-size-warning"]').should('contain', 'Large file detected')
      cy.get('[data-testid="processing-estimate"]').should('be.visible')

      // Should allow processing with progress indication
      cy.get('[data-testid="profile-selector"]').select('Processing Test Character')
      cy.get('[data-testid="start-processing-btn"]').click()

      cy.get('[data-testid="large-file-processing"]').should('be.visible')
      cy.get('[data-testid="chunked-upload-progress"]').should('be.visible')
    })
  })

  context('Batch Processing', () => {
    beforeEach(() => {
      // Create multiple test profiles
      cy.createTestProfile({ name: 'Batch Character 1', emotions: ['happy'], angles: ['CU'] })
      cy.createTestProfile({ name: 'Batch Character 2', emotions: ['sad'], angles: ['MS'] })
    })

    it('should process multiple files in batch', () => {
      cy.get('[data-testid="nav-processing"]').click()
      cy.get('[data-testid="batch-processing-tab"]').click()

      // Add multiple files
      const files = ['batch-audio-1.mp3', 'batch-audio-2.mp3', 'batch-audio-3.mp3']
      files.forEach((file, index) => {
        cy.get('[data-testid="add-file-btn"]').click()
        cy.get(`[data-testid="file-input-${index}"]`).attachFile(file)
      })

      // Verify queue
      cy.get('[data-testid="batch-queue"]').should('be.visible')
      cy.get('[data-testid="queue-item"]').should('have.length', 3)

      // Configure batch settings
      cy.get('[data-testid="batch-settings"]').within(() => {
        cy.get('[data-testid="apply-same-profile"]').check()
        cy.get('[data-testid="batch-profile-selector"]').select('Processing Test Character')
        cy.get('[data-testid="batch-processing-mode"]').select('sequential')
        cy.get('[data-testid="enable-batch-emotion-detection"]').check()
      })

      // Start batch processing
      cy.intercept('POST', '/api/batch-process', { fixture: 'batch-start.json' }).as('startBatch')
      cy.get('[data-testid="start-batch-btn"]').click()

      cy.wait('@startBatch')
      cy.get('[data-testid="batch-processing-started"]').should('contain', 'Batch processing started')

      // Verify batch progress
      cy.get('[data-testid="batch-progress"]').should('be.visible')
      cy.get('[data-testid="overall-progress"]').should('be.visible')
      cy.get('[data-testid="individual-progress"]').should('be.visible')

      // Simulate batch processing
      cy.simulateBatchProcessing([
        { file: 'batch-audio-1.mp3', progress: 100, status: 'completed' },
        { file: 'batch-audio-2.mp3', progress: 100, status: 'completed' },
        { file: 'batch-audio-3.mp3', progress: 100, status: 'completed' },
      ])

      // Verify completion
      cy.get('[data-testid="batch-complete"]').should('contain', 'Batch processing completed')
      cy.get('[data-testid="batch-summary"]').should('be.visible')

      // Download batch results
      cy.get('[data-testid="download-batch-btn"]').click()
      cy.readFile('cypress/downloads/batch-results.zip').should('exist')
    })

    it('should handle batch processing with different profiles', () => {
      cy.get('[data-testid="nav-processing"]').click()
      cy.get('[data-testid="batch-processing-tab"]').click()

      // Add files
      cy.get('[data-testid="add-file-btn"]').click()
      cy.get('[data-testid="file-input-0"]').attachFile('batch-audio-1.mp3')
      cy.get('[data-testid="add-file-btn"]').click()
      cy.get('[data-testid="file-input-1"]').attachFile('batch-audio-2.mp3')

      // Configure different profiles for each file
      cy.get('[data-testid="batch-settings"]').within(() => {
        cy.get('[data-testid="apply-different-profiles"]').check()
      })

      // Select profiles for each file
      cy.get('[data-testid="queue-item"]').eq(0).within(() => {
        cy.get('[data-testid="file-profile-selector"]').select('Batch Character 1')
      })
      cy.get('[data-testid="queue-item"]').eq(1).within(() => {
        cy.get('[data-testid="file-profile-selector"]').select('Batch Character 2')
      })

      // Start batch processing
      cy.get('[data-testid="start-batch-btn"]').click()

      // Verify each file processes with correct profile
      cy.get('[data-testid="processing-with-profile"]').should('contain', 'Batch Character 1')
      cy.get('[data-testid="processing-with-profile"]').should('contain', 'Batch Character 2')
    })

    it('should handle batch processing errors', () => {
      cy.get('[data-testid="nav-processing"]').click()
      cy.get('[data-testid="batch-processing-tab"]').click()

      // Add files
      cy.get('[data-testid="add-file-btn"]').click()
      cy.get('[data-testid="file-input-0"]').attachFile('batch-audio-1.mp3')
      cy.get('[data-testid="add-file-btn"]').click()
      cy.get('[data-testid="file-input-1"]').attachFile('corrupted-audio.mp3')

      // Start batch processing
      cy.get('[data-testid="start-batch-btn"]').click()

      // Simulate error for second file
      cy.simulateBatchProcessing([
        { file: 'batch-audio-1.mp3', progress: 100, status: 'completed' },
        { file: 'corrupted-audio.mp3', progress: 0, status: 'failed', error: 'Corrupted file' },
      ])

      // Verify error handling
      cy.get('[data-testid="batch-error"]').should('contain', 'Some files failed to process')
      cy.get('[data-testid="failed-items"]').should('contain', 'corrupted-audio.mp3')
      cy.get('[data-testid="retry-failed-btn"]').should('be.visible')

      // Retry failed files
      cy.get('[data-testid="retry-failed-btn"]').click()

      // Verify retry
      cy.get('[data-testid="retrying-failed"]').should('contain', 'Retrying failed files')
    })

    it('should allow batch queue management', () => {
      cy.get('[data-testid="nav-processing"]').click()
      cy.get('[data-testid="batch-processing-tab"]').click()

      // Add multiple files
      for (let i = 0; i < 5; i++) {
        cy.get('[data-testid="add-file-btn"]').click()
        cy.get(`[data-testid="file-input-${i}"]`).attachFile(`batch-audio-${i}.mp3`)
      }

      // Reorder queue
      cy.get('[data-testid="queue-item"]').eq(0).dragTo('[data-testid="queue-item"]').eq(3)

      // Remove items
      cy.get('[data-testid="queue-item"]').eq(1).within(() => {
        cy.get('[data-testid="remove-item-btn"]').click()
      })

      // Verify queue changes
      cy.get('[data-testid="queue-item"]').should('have.length', 4)

      // Clear queue
      cy.get('[data-testid="clear-queue-btn"]').click()
      cy.get('[data-testid="clear-confirmation"]').should('be.visible')
      cy.get('[data-testid="confirm-clear"]').click()

      // Verify queue is empty
      cy.get('[data-testid="batch-queue"]').should('contain', 'No files in queue')
    })
  })

  context('Real-time Processing Updates', () => {
    it('should display real-time processing progress', () => {
      cy.get('[data-testid="nav-processing"]').click()

      // Start processing
      cy.get('[data-testid="audio-upload"]').attachFile('test-audio.mp3')
      cy.get('[data-testid="profile-selector"]').select('Processing Test Character')
      cy.get('[data-testid="start-processing-btn"]').click()

      // Mock WebSocket updates
      cy.mockWebSocketUpdates([
        { type: 'processing_progress', data: { progress: 10, stage: 'Audio Analysis' } },
        { type: 'processing_progress', data: { progress: 25, stage: 'Audio Analysis' } },
        { type: 'processing_progress', data: { progress: 50, stage: 'Emotion Detection' } },
        { type: 'processing_progress', data: { progress: 75, stage: 'Shot Selection' } },
        { type: 'processing_complete', data: { progress: 100 } },
      ])

      // Verify real-time updates
      cy.get('[data-testid="progress-percentage"]').should('contain', '10%')
      cy.get('[data-testid="current-stage"]').should('contain', 'Audio Analysis')

      cy.get('[data-testid="progress-percentage"]').should('contain', '50%')
      cy.get('[data-testid="current-stage"]').should('contain', 'Emotion Detection')

      cy.get('[data-testid="progress-percentage"]').should('contain', '100%')
      cy.get('[data-testid="processing-complete"]').should('be.visible')
    })

    it('should handle connection interruptions during processing', () => {
      cy.get('[data-testid="nav-processing"]').click()

      // Start processing
      cy.get('[data-testid="audio-upload"]').attachFile('test-audio.mp3')
      cy.get('[data-testid="profile-selector"]').select('Processing Test Character')
      cy.get('[data-testid="start-processing-btn"]').click()

      // Simulate connection loss
      cy.simulateConnectionLoss()

      // Should show connection warning
      cy.get('[data-testid="connection-warning"]').should('contain', 'Connection lost')
      cy.get('[data-testid="processing-continues"]').should('contain', 'Processing continues in background')

      // Restore connection
      cy.simulateConnectionRestore()

      // Should sync with server state
      cy.get('[data-testid="syncing-progress"]').should('contain', 'Syncing progress')
      cy.get('[data-testid="connection-restored"]').should('contain', 'Connection restored')
    })
  })

  context('Processing Results and Analytics', () => {
    it('should display comprehensive processing results', () => {
      // Complete a processing job first
      cy.completeProcessingJob()

      cy.get('[data-testid="nav-processing"]').click()

      // View results
      cy.get('[data-testid="view-results-btn"]').click()

      // Verify emotion analysis results
      cy.get('[data-testid="emotion-analysis"]').within(() => {
        cy.get('[data-testid="emotion-chart"]').should('be.visible')
        cy.get('[data-testid="emotion-timeline"]').should('be.visible')
        cy.get('[data-testid="emotion-breakdown"]').should('be.visible')
      })

      // Verify shot list
      cy.get('[data-testid="shot-list"]').within(() => {
        cy.get('[data-testid="shot-item"]').should('have.length.greaterThan', 0)
        cy.get('[data-testid="shot-type"]').should('be.visible')
        cy.get('[data-testid="shot-timing"]').should('be.visible')
        cy.get('[data-testid="shot-angle"]').should('be.visible')
      })

      // Verify viseme mapping
      cy.get('[data-testid="viseme-mapping"]').within(() => {
        cy.get('[data-testid="viseme-timeline"]').should('be.visible')
        cy.get('[data-testid="viseme-details"]').should('be.visible')
      })

      // Export results in different formats
      cy.get('[data-testid="export-results"]').click()
      cy.get('[data-testid="export-format-json"]').click()
      cy.readFile('cypress/downloads/results.json').should('exist')

      cy.get('[data-testid="export-results"]').click()
      cy.get('[data-testid="export-format-csv"]').click()
      cy.readFile('cypress/downloads/results.csv').should('exist')
    })

    it('should provide processing analytics', () => {
      // Complete multiple processing jobs
      for (let i = 0; i < 3; i++) {
        cy.completeProcessingJob()
      }

      cy.get('[data-testid="nav-processing"]').click()
      cy.get('[data-testid="analytics-tab"]').click()

      // Verify analytics dashboard
      cy.get('[data-testid="processing-stats"]').should('be.visible')
      cy.get('[data-testid="total-processing-time"]').should('be.visible')
      cy.get('[data-testid="average-processing-time"]').should('be.visible')
      cy.get('[data-testid="success-rate"]').should('be.visible')

      // Verify charts
      cy.get('[data-testid="processing-time-chart"]').should('be.visible')
      cy.get('[data-testid="emotion-distribution-chart"]').should('be.visible')
      cy.get('[data-testid="shot-type-chart"]').should('be.visible')

      // Filter analytics
      cy.get('[data-testid="analytics-date-range"]').select('Last 7 days')
      cy.get('[data-testid="analytics-profile-filter"]').select('Processing Test Character')

      // Verify filtered results
      cy.get('[data-testid="filtered-stats"]').should('be.visible')
    })
  })

  context('Performance and Load Testing', () => {
    it('should handle concurrent processing requests', () => {
      // Start multiple processing jobs
      for (let i = 0; i < 5; i++) {
        cy.get('[data-testid="nav-processing"]').click()
        cy.get('[data-testid="audio-upload"]').attachFile(`concurrent-audio-${i}.mp3`)
        cy.get('[data-testid="profile-selector"]').select('Processing Test Character')
        cy.get('[data-testid="start-processing-btn"]').click()
        
        // Switch to new tab for next job
        if (i < 4) {
          cy.get('[data-testid="new-processing-tab"]').click()
        }
      }

      // Verify all jobs are running
      cy.get('[data-testid="processing-tabs"]').should('have.length', 5)
      cy.get('[data-testid="processing-progress"]').should('have.length', 5)

      // Verify system performance
      cy.get('[data-testid="system-load"]').should('be.visible')
      cy.get('[data-testid="cpu-usage"]').should('be.visible')
      cy.get('[data-testid="memory-usage"]').should('be.visible')
    })

    it('should handle large batch processing efficiently', () => {
      cy.get('[data-testid="nav-processing"]').click()
      cy.get('[data-testid="batch-processing-tab"]').click()

      // Add many files
      for (let i = 0; i < 50; i++) {
        cy.get('[data-testid="add-file-btn"]').click()
        cy.get(`[data-testid="file-input-${i}"]`).attachFile(`large-batch-${i}.mp3`)
      }

      // Verify UI remains responsive
      cy.get('[data-testid="queue-item"]').should('have.length', 50)
      cy.get('[data-testid="batch-progress"]').should('be.visible')

      // Start batch processing
      cy.get('[data-testid="start-batch-btn"]').click()

      // Verify progress updates efficiently
      cy.get('[data-testid="batch-overview"]').should('be.visible')
      cy.get('[data-testid="completed-count"]').should('be.visible')
      cy.get('[data-testid="remaining-time"]').should('be.visible')
    })
  })
})