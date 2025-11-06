describe('Profile Management E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.login('test@example.com', 'password')
  })

  context('Profile Creation Workflow', () => {
    it('should create a complete profile with all settings', () => {
      // Navigate to profiles
      cy.get('[data-testid="nav-profiles"]').click()
      cy.get('[data-testid="page-title"]').should('contain', 'Profile Management')

      // Start profile creation
      cy.get('[data-testid="create-profile-btn"]').click()
      cy.get('[data-testid="profile-form"]').should('be.visible')

      // Fill basic information
      cy.get('[data-testid="profile-name-input"]').type('Test Character')
      cy.get('[data-testid="profile-description-input"]').type('A test character for E2E testing')

      // Select emotions
      cy.get('[data-testid="emotion-selector"]').within(() => {
        cy.get('[data-value="happy"]').click()
        cy.get('[data-value="sad"]').click()
        cy.get('[data-value="angry"]').click()
      })

      // Verify emotion selection
      cy.get('[data-testid="selected-emotions"]').within(() => {
        cy.get('[data-testid="emotion-tag"]').should('have.length', 3)
      })

      // Select angles
      cy.get('[data-testid="angle-selector"]').within(() => {
        cy.get('[data-value="CU"]').click()
        cy.get('[data-value="ECU"]').click()
        cy.get('[data-value="MS"]').click()
      })

      // Upload profile image
      cy.get('[data-testid="profile-image-upload"]').attachFile('test-profile.jpg')
      cy.get('[data-testid="image-preview"]').should('be.visible')

      // Configure viseme mappings
      cy.get('[data-testid="viseme-mapping-tab"]').click()
      cy.get('[data-testid="viseme-grid"]').should('be.visible')

      // Add custom viseme mapping
      cy.get('[data-testid="add-viseme-btn"]').click()
      cy.get('[data-testid="viseme-input"]').type('AA')
      cy.get('[data-testid="audio-file-input"]').attachFile('test-viseme.wav')
      cy.get('[data-testid="save-viseme-btn"]').click()

      // Configure cinematography settings
      cy.get('[data-testid="cinematography-tab"]').click()
      cy.get('[data-testid="shot-preference-selector"]').select('dramatic')
      cy.get('[data-testid="tension-slider"]').invoke('val', 75).trigger('change')

      // Save profile
      cy.get('[data-testid="save-profile-btn"]').click()

      // Verify success
      cy.get('[data-testid="success-message"]').should('contain', 'Profile created successfully')
      cy.get('[data-testid="profile-list"]').should('contain', 'Test Character')

      // Verify profile details
      cy.get('[data-testid="profile-item"]').within(() => {
        cy.get('[data-testid="profile-name"]').should('contain', 'Test Character')
        cy.get('[data-testid="profile-emotions"]').should('contain', 'happy, sad, angry')
        cy.get('[data-testid="profile-angles"]').should('contain', 'CU, ECU, MS')
      })
    })

    it('should validate profile form inputs', () => {
      cy.get('[data-testid="nav-profiles"]').click()
      cy.get('[data-testid="create-profile-btn"]').click()

      // Try to submit without required fields
      cy.get('[data-testid="save-profile-btn"]').click()

      // Check validation errors
      cy.get('[data-testid="validation-errors"]').should('be.visible')
      cy.get('[data-testid="error-profile-name"]').should('contain', 'Profile name is required')
      cy.get('[data-testid="error-emotions"]').should('contain', 'At least one emotion must be selected')
      cy.get('[data-testid="error-angles"]').should('contain', 'At least one angle must be selected')

      // Fix validation errors
      cy.get('[data-testid="profile-name-input"]').type('Valid Profile Name')
      cy.get('[data-testid="emotion-selector"]').within(() => {
        cy.get('[data-value="happy"]').click()
      })
      cy.get('[data-testid="angle-selector"]').within(() => {
        cy.get('[data-value="CU"]').click()
      })

      // Should now be able to save
      cy.get('[data-testid="save-profile-btn"]').click()
      cy.get('[data-testid="success-message"]').should('be.visible')
    })

    it('should handle profile creation errors gracefully', () => {
      cy.intercept('POST', '/api/profiles', { statusCode: 500, body: { error: 'Server error' } }).as('createProfileError')

      cy.get('[data-testid="nav-profiles"]').click()
      cy.get('[data-testid="create-profile-btn"]').click()

      // Fill form
      cy.get('[data-testid="profile-name-input"]').type('Error Profile')
      cy.get('[data-testid="emotion-selector"]').within(() => {
        cy.get('[data-value="happy"]').click()
      })
      cy.get('[data-testid="angle-selector"]').within(() => {
        cy.get('[data-value="CU"]').click()
      })

      // Try to save
      cy.get('[data-testid="save-profile-btn"]').click()

      // Wait for error response
      cy.wait('@createProfileError')
      cy.get('[data-testid="error-message"]').should('contain', 'Failed to create profile')
      cy.get('[data-testid="retry-btn"]').should('be.visible')
    })
  })

  context('Profile Editing and Management', () => {
    beforeEach(() => {
      // Create test profile
      cy.createTestProfile({
        name: 'Edit Test Character',
        emotions: ['happy', 'sad'],
        angles: ['CU', 'ECU'],
      })
    })

    it('should edit existing profile', () => {
      cy.get('[data-testid="nav-profiles"]').click()

      // Edit profile
     cy.get('[data-testid="edit-profile-Edit Test Character"]').click()
      cy.get('[data-testid="profile-form"]').should('be.visible')

      // Update profile name
      cy.get('[data-testid="profile-name-input"]').clear().type('Updated Character Name')

      // Add new emotion
      cy.get('[data-testid="emotion-selector"]').within(() => {
        cy.get('[data-value="angry"]').click()
      })

      // Remove angle
      cy.get('[data-testid="angle-selector"]').within(() => {
        cy.get('[data-value="ECU"]').click()
      })

      // Save changes
      cy.get('[data-testid="save-profile-btn"]').click()

      // Verify updates
      cy.get('[data-testid="success-message"]').should('contain', 'Profile updated successfully')
      cy.get('[data-testid="profile-list"]').should('contain', 'Updated Character Name')
      cy.get('[data-testid="profile-emotions"]').should('contain', 'happy, sad, angry')
      cy.get('[data-testid="profile-angles"]').should('not.contain', 'ECU')
    })

    it('should delete profile with confirmation', () => {
      cy.get('[data-testid="nav-profiles"]').click()

      // Delete profile
      cy.get('[data-testid="delete-profile-Edit Test Character"]').click()

      // Confirmation modal
      cy.get('[data-testid="delete-modal"]').should('be.visible')
      cy.get('[data-testid="modal-title"]').should('contain', 'Delete Profile')
      cy.get('[data-testid="modal-message"]').should('contain', 'Are you sure')

      // Confirm deletion
      cy.get('[data-testid="confirm-delete-btn"]').click()

      // Verify deletion
      cy.get('[data-testid="success-message"]').should('contain', 'Profile deleted successfully')
      cy.get('[data-testid="profile-list"]').should('not.contain', 'Edit Test Character')
    })

    it('should cancel profile deletion', () => {
      cy.get('[data-testid="nav-profiles"]').click()

      // Start deletion
      cy.get('[data-testid="delete-profile-Edit Test Character"]').click()
      cy.get('[data-testid="delete-modal"]').should('be.visible')

      // Cancel deletion
      cy.get('[data-testid="cancel-delete-btn"]').click()

      // Verify modal closes and profile remains
      cy.get('[data-testid="delete-modal"]').should('not.exist')
      cy.get('[data-testid="profile-list"]').should('contain', 'Edit Test Character')
    })

    it('should duplicate existing profile', () => {
      cy.get('[data-testid="nav-profiles"]').click()

      // Duplicate profile
      cy.get('[data-testid="duplicate-profile-Edit Test Character"]').click()

      // Verify duplicate form is pre-filled
      cy.get('[data-testid="profile-name-input"]').should('contain.value', 'Edit Test Character (Copy)')
      cy.get('[data-testid="selected-emotions"]').should('contain', 'happy')
      cy.get('[data-testid="selected-emotions"]').should('contain', 'sad')

      // Save duplicate
      cy.get('[data-testid="save-profile-btn"]').click()

      // Verify both profiles exist
      cy.get('[data-testid="profile-list"]').should('contain', 'Edit Test Character')
      cy.get('[data-testid="profile-list"]').should('contain', 'Edit Test Character (Copy)')
    })
  })

  context('Profile Search and Filtering', () => {
    beforeEach(() => {
      // Create multiple test profiles
      cy.createTestProfile({ name: 'Character A', emotions: ['happy'], angles: ['CU'] })
      cy.createTestProfile({ name: 'Character B', emotions: ['sad'], angles: ['MS'] })
      cy.createTestProfile({ name: 'Character C', emotions: ['angry'], angles: ['ECU'] })
    })

    it('should search profiles by name', () => {
      cy.get('[data-testid="nav-profiles"]').click()

      // Search for specific character
      cy.get('[data-testid="profile-search"]').type('Character A')
      cy.get('[data-testid="profile-list"]').should('contain', 'Character A')
      cy.get('[data-testid="profile-list"]').should('not.contain', 'Character B')
      cy.get('[data-testid="profile-list"]').should('not.contain', 'Character C')

      // Clear search
      cy.get('[data-testid="profile-search"]').clear()
      cy.get('[data-testid="profile-list"]').should('contain', 'Character A')
      cy.get('[data-testid="profile-list"]').should('contain', 'Character B')
      cy.get('[data-testid="profile-list"]').should('contain', 'Character C')
    })

    it('should filter profiles by emotions', () => {
      cy.get('[data-testid="nav-profiles"]').click()

      // Filter by happy emotion
      cy.get('[data-testid="emotion-filter"]').select('happy')
      cy.get('[data-testid="profile-list"]').should('contain', 'Character A')
      cy.get('[data-testid="profile-list"]').should('not.contain', 'Character B')
      cy.get('[data-testid="profile-list"]').should('not.contain', 'Character C')

      // Filter by sad emotion
      cy.get('[data-testid="emotion-filter"]').select('sad')
      cy.get('[data-testid="profile-list"]').should('not.contain', 'Character A')
      cy.get('[data-testid="profile-list"]').should('contain', 'Character B')
      cy.get('[data-testid="profile-list"]').should('not.contain', 'Character C')
    })

    it('should filter profiles by angles', () => {
      cy.get('[data-testid="nav-profiles"]').click()

      // Filter by CU angle
      cy.get('[data-testid="angle-filter"]').select('CU')
      cy.get('[data-testid="profile-list"]').should('contain', 'Character A')
      cy.get('[data-testid="profile-list"]').should('not.contain', 'Character B')
      cy.get('[data-testid="profile-list"]').should('not.contain', 'Character C')

      // Filter by MS angle
      cy.get('[data-testid="angle-filter"]').select('MS')
      cy.get('[data-testid="profile-list"]').should('not.contain', 'Character A')
      cy.get('[data-testid="profile-list"]').should('contain', 'Character B')
      cy.get('[data-testid="profile-list"]').should('not.contain', 'Character C')
    })

    it('should sort profiles', () => {
      cy.get('[data-testid="nav-profiles"]').click()

      // Sort by name (A-Z)
      cy.get('[data-testid="sort-selector"]').select('name-asc')
      cy.get('[data-testid="profile-item"]').eq(0).should('contain', 'Character A')
      cy.get('[data-testid="profile-item"]').eq(1).should('contain', 'Character B')
      cy.get('[data-testid="profile-item"]').eq(2).should('contain', 'Character C')

      // Sort by name (Z-A)
      cy.get('[data-testid="sort-selector"]').select('name-desc')
      cy.get('[data-testid="profile-item"]').eq(0).should('contain', 'Character C')
      cy.get('[data-testid="profile-item"]').eq(1).should('contain', 'Character B')
      cy.get('[data-testid="profile-item"]').eq(2).should('contain', 'Character A')

      // Sort by creation date
      cy.get('[data-testid="sort-selector"]').select('created-desc')
      cy.get('[data-testid="profile-item"]').eq(0).should('contain', 'Character C') // Most recent
    })
  })

  context('Profile Export and Import', () => {
    beforeEach(() => {
      cy.createTestProfile({
        name: 'Export Test Character',
        emotions: ['happy', 'sad'],
        angles: ['CU', 'MS'],
      })
    })

    it('should export single profile', () => {
      cy.get('[data-testid="nav-profiles"]').click()

      // Export profile
      cy.get('[data-testid="export-profile-Export Test Character"]').click()

      // Verify download
      cy.readFile('cypress/downloads/Export Test Character.json').should('exist')
      cy.readFile('cypress/downloads/Export Test Character.json').then((profile) => {
        expect(profile.name).to.equal('Export Test Character')
        expect(profile.emotions).to.deep.equal(['happy', 'sad'])
        expect(profile.angles).to.deep.equal(['CU', 'MS'])
      })
    })

    it('should export multiple profiles', () => {
      cy.createTestProfile({ name: 'Second Character', emotions: ['angry'], angles: ['ECU'] })

      cy.get('[data-testid="nav-profiles"]').click()

      // Select profiles
      cy.get('[data-testid="profile-checkbox-Export Test Character"]').check()
      cy.get('[data-testid="profile-checkbox-Second Character"]').check()

      // Export selected
      cy.get('[data-testid="export-selected-btn"]').click()

      // Verify download
      cy.readFile('cypress/downloads/profiles-export.json').should('exist')
      cy.readFile('cypress/downloads/profiles-export.json').then((profiles) => {
        expect(profiles).to.have.length(2)
        expect(profiles[0].name).to.equal('Export Test Character')
        expect(profiles[1].name).to.equal('Second Character')
      })
    })

    it('should import profiles', () => {
      cy.get('[data-testid="nav-profiles"]').click()

      // Import profiles
      cy.get('[data-testid="import-profiles-btn"]').click()
      cy.get('[data-testid="import-file-input"]').attachFile('test-profiles.json')
      cy.get('[data-testid="import-confirm-btn"]').click()

      // Verify import success
      cy.get('[data-testid="success-message"]').should('contain', 'Profiles imported successfully')
      cy.get('[data-testid="profile-list"]').should('contain', 'Imported Character 1')
      cy.get('[data-testid="profile-list"]').should('contain', 'Imported Character 2')
    })

    it('should handle import errors', () => {
      cy.get('[data-testid="nav-profiles"]').click()

      // Try to import invalid file
      cy.get('[data-testid="import-profiles-btn"]').click()
      cy.get('[data-testid="import-file-input"]').attachFile('invalid-profiles.json')
      cy.get('[data-testid="import-confirm-btn"]').click()

      // Verify error message
      cy.get('[data-testid="error-message"]').should('contain', 'Failed to import profiles')
      cy.get('[data-testid="error-details"]').should('be.visible')
    })
  })

  context('Profile Performance', () => {
    it('should handle large number of profiles efficiently', () => {
      // Create many profiles
      for (let i = 0; i < 100; i++) {
        cy.createTestProfile({
          name: `Performance Test ${i}`,
          emotions: ['happy'],
          angles: ['CU'],
        })
      }

      cy.get('[data-testid="nav-profiles"]').click()

      // Should render quickly
      cy.get('[data-testid="profile-list"]').should('be.visible')
      cy.get('[data-testid="profile-item"]').should('have.length', 100)

      // Search should be responsive
      cy.get('[data-testid="profile-search"]').type('Performance Test 50')
      cy.get('[data-testid="profile-item"]').should('have.length', 1)

      // Pagination should work
      cy.get('[data-testid="pagination"]').should('be.visible')
      cy.get('[data-testid="page-2"]').click()
      cy.url().should('include', 'page=2')
    })

    it('should handle profile operations under load', () => {
      // Create profiles
      for (let i = 0; i < 50; i++) {
        cy.createTestProfile({
          name: `Load Test ${i}`,
          emotions: ['happy', 'sad'],
          angles: ['CU', 'MS'],
        })
      }

      cy.get('[data-testid="nav-profiles"]').click()

      // Perform multiple operations
      cy.get('[data-testid="profile-search"]').type('Load Test 25')
      cy.get('[data-testid="emotion-filter"]').select('happy')
      cy.get('[data-testid="sort-selector"]').select('name-desc')

      // Verify UI remains responsive
      cy.get('[data-testid="profile-item"]').should('have.length', 1)
      cy.get('[data-testid="loading-spinner"]').should('not.exist')
    })
  })
})