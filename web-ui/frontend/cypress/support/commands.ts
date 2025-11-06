// Custom Cypress commands for general use

// Login command
Cypress.Commands.add('login', (email = 'test@example.com', password = 'password') => {
  cy.visit('/login')
  cy.get('[data-testid="email-input"]').type(email)
  cy.get('[data-testid="password-input"]').type(password)
  cy.get('[data-testid="login-button"]').click()
  cy.url().should('not.include', '/login')
})

// Profile management commands
Cypress.Commands.add('createProfile', (profileData) => {
  cy.get('[data-testid="create-profile-button"]').click()
  cy.get('[data-testid="profile-name-input"]').type(profileData.name)
  cy.get('[data-testid="profile-description-input"]').type(profileData.description)
  cy.get('[data-testid="save-profile-button"]').click()
  cy.get('[data-testid="profile-list"]').should('contain', profileData.name)
})

Cypress.Commands.add('selectProfile', (profileName) => {
  cy.get('[data-testid="profile-selector"]').click()
  cy.get('[data-testid="profile-option"]').contains(profileName).click()
})

// File upload commands
Cypress.Commands.add('uploadFile', (fileName, fileType = 'audio/mp3') => {
  cy.get('[data-testid="file-input"]').attachFile({
    fileContent: fileName,
    fileName: fileName,
    mimeType: fileType,
  })
})

// Processing commands
Cypress.Commands.add('startProcessing', () => {
  cy.get('[data-testid="start-processing-button"]').click()
  cy.get('[data-testid="processing-status"]').should('be.visible')
})

Cypress.Commands.add('waitForProcessing', (timeout = 60000) => {
  cy.get('[data-testid="processing-complete"]', { timeout }).should('be.visible')
})

// WebSocket commands
Cypress.Commands.add('waitForWebSocketConnection', () => {
  cy.get('[data-testid="websocket-status"]').should('contain', 'Connected')
})

Cypress.Commands.add('waitForWebSocketMessage', (messageType, timeout = 10000) => {
  cy.get(`[data-testid="websocket-message-${messageType}"]`, { timeout }).should('be.visible')
})

// Navigation commands
Cypress.Commands.add('navigateTo', (page) => {
  cy.get('[data-testid="navigation"]').should('be.visible')
  cy.get(`[data-testid="nav-${page}"]`).click()
  cy.url().should('include', `/${page}`)
})

// Component interaction commands
Cypress.Commands.add('toggleComponent', (componentTestId) => {
  cy.get(`[data-testid="${componentTestId}"]`).click()
})

Cypress.Commands.add('setSlider', (sliderTestId, value) => {
  cy.get(`[data-testid="${sliderTestId}"]`).invoke('val', value).trigger('change')
})

Cypress.Commands.add('selectOption', (selectTestId, option) => {
  cy.get(`[data-testid="${selectTestId}"]`).select(option)
})

// Data validation commands
Cypress.Commands.add('validateChartData', (chartTestId, expectedDataPoints) => {
  cy.get(`[data-testid="${chartTestId}"]`).should('be.visible')
  cy.get(`[data-testid="${chartTestId}"] [data-testid="data-point"]`).should('have.length', expectedDataPoints)
})

Cypress.Commands.add('validateTableData', (tableTestId, expectedRows) => {
  cy.get(`[data-testid="${tableTestId}"]`).should('be.visible')
  cy.get(`[data-testid="${tableTestId}"] tbody tr`).should('have.length', expectedRows)
})

// Error handling commands
Cypress.Commands.add('shouldNotHaveErrors', () => {
  cy.get('[data-testid="error-message"]').should('not.exist')
  cy.get('[data-testid="error-toast"]').should('not.exist')
})

Cypress.Commands.add('shouldHaveError', (errorMessage) => {
  cy.get('[data-testid="error-message"]').should('be.visible').and('contain', errorMessage)
})

// Loading states
Cypress.Commands.add('waitForLoading', (timeout = 10000) => {
  cy.get('[data-testid="loading-spinner"]', { timeout }).should('not.exist')
})

// Responsive testing
Cypress.Commands.add('testResponsive', (breakpoints) => {
  breakpoints.forEach(({ width, height, name }) => {
    cy.viewport(width, height)
    cy.log(`Testing ${name} (${width}x${height})`)
    cy.get('body').should('be.visible')
    // Add specific responsive checks here
  })
})

// Dark mode testing
Cypress.Commands.add('toggleDarkMode', () => {
  cy.get('[data-testid="theme-toggle"]').click()
})

// Form validation
Cypress.Commands.add('submitForm', (formTestId) => {
  cy.get(`[data-testid="${formTestId}"] [data-testid="submit-button"]`).click()
})

Cypress.Commands.add('validateFormField', (fieldTestId, expectedError) => {
  cy.get(`[data-testid="${fieldTestId}"]`).should('have.class', 'error')
  cy.get(`[data-testid="${fieldTestId}-error"]`).should('contain', expectedError)
})