// Import commands.js using ES2015 syntax:
import './commands'
import './accessibility-commands'
import './performance-commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add axe for accessibility testing
import 'cypress-axe'

// Performance monitoring setup
beforeEach(() => {
  // Clear local storage before each test
  cy.clearLocalStorage()
  cy.clearCookies()
  
  // Performance monitoring start
  cy.window().then((win) => {
    win.performance.mark('test-start')
  })
})

afterEach(() => {
  // Performance monitoring end
  cy.window().then((win) => {
    win.performance.mark('test-end')
    win.performance.measure('test-duration', 'test-start', 'test-end')
    
    const measures = win.performance.getEntriesByName('test-duration')
    if (measures.length > 0) {
      const duration = measures[0].duration
      cy.log(`Test duration: ${duration}ms`)
      
      // Fail test if it takes too long
      if (duration > 30000) {
        cy.log('⚠️ Test took longer than 30 seconds')
      }
    }
  })
})

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing on uncaught exceptions in certain cases
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false
  }
  return true
})

// Network monitoring
beforeEach(() => {
  cy.intercept('GET', '/api/**').as('apiGet')
  cy.intercept('POST', '/api/**').as('apiPost')
  cy.intercept('PUT', '/api/**').as('apiPut')
  cy.intercept('DELETE', '/api/**').as('apiDelete')
})

// Performance budgets
const PERFORMANCE_BUDGETS = {
  'First Contentful Paint': 2000,
  'Largest Contentful Paint': 2500,
  'Time to Interactive': 3000,
  'Cumulative Layout Shift': 0.1,
  'First Input Delay': 100,
}

// Core Web Vitals monitoring
afterEach(() => {
  cy.window().then((win) => {
    // Check if performance metrics are available
    if (win.performance && win.performance.getEntriesByType) {
      const navigation = win.performance.getEntriesByType('navigation')[0]
      
      if (navigation) {
        const fcp = navigation.responseStart - navigation.requestStart
        cy.log(`First Contentful Paint: ${fcp}ms`)
        
        if (fcp > PERFORMANCE_BUDGETS['First Contentful Paint']) {
          cy.log(`⚠️ FCP exceeds budget of ${PERFORMANCE_BUDGETS['First Contentful Paint']}ms`)
        }
      }
    }
  })
})