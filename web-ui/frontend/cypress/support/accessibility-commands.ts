// Accessibility testing commands with axe-core

import { AxeResults, Violation } from 'axe-core'

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Inject axe-core into the page
       */
      injectAxe(): Chainable<void>
      
      /**
       * Check the page for accessibility violations
       * @param context - The context to check (default: 'body')
       * @param options - Axe options
       */
      checkA11y(context?: string, options?: any, violationCallback?: (violations: Violation[]) => void): Chainable<void>
      
      /**
       * Check component for accessibility violations
       * @param component - Component selector
       * @param options - Axe options
       */
      checkComponentA11y(component: string, options?: any): Chainable<void>
      
      /**
       * Check specific accessibility rule
       * @param rule - The rule to check
       * @param context - The context to check
       */
      checkA11yRule(rule: string, context?: string): Chainable<void>
      
      /**
       * Verify color contrast
       * @param element - Element selector
       */
      checkColorContrast(element: string): Chainable<void>
      
      /**
       * Check keyboard navigation
       * @param selector - Starting element selector
       */
      checkKeyboardNavigation(selector?: string): Chainable<void>
      
      /**
       * Verify ARIA labels
       * @param selector - Element selector
       * @param expectedLabel - Expected label text
       */
      checkAriaLabel(selector: string, expectedLabel: string): Chainable<void>
      
      /**
       * Verify focus management
       * @param selector - Element that should receive focus
       */
      checkFocusManagement(selector: string): Chainable<void>
      
      /**
       * Check screen reader announcements
       * @param expectedAnnouncement - Expected announcement text
       */
      checkScreenReaderAnnouncement(expectedAnnouncement: string): Chainable<void>
    }
  }
}

Cypress.Commands.add('injectAxe', () => {
  cy.window({ log: false }).then((win) => {
    if (typeof win.axe === 'undefined') {
      cy.log('Injecting axe-core')
      cy.task('log', 'Injecting axe-core for accessibility testing')
    }
  })
})

Cypress.Commands.add('checkA11y', (context = 'body', options = {}, violationCallback = undefined) => {
  cy.injectAxe()
  
  const defaultOptions = {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21aa'],
    },
    reporter: 'v2',
    rules: {
      // Disable rules that don't apply to our app
      'color-contrast': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'aria-labels': { enabled: true },
      'focus-management': { enabled: true },
    },
  }
  
  const mergedOptions = { ...defaultOptions, ...options }
  
  cy.checkA11y(context, mergedOptions, violationCallback, true)
})

Cypress.Commands.add('checkComponentA11y', (component, options = {}) => {
  cy.injectAxe()
  cy.get(component).should('be.visible')
  cy.checkA11y(component, options)
})

Cypress.Commands.add('checkA11yRule', (rule, context = 'body') => {
  cy.injectAxe()
  cy.checkA11y(context, {
    rules: {
      [rule]: { enabled: true },
    },
  })
})

Cypress.Commands.add('checkColorContrast', (element) => {
  cy.injectAxe()
  cy.checkA11yRule('color-contrast', element)
})

Cypress.Commands.add('checkKeyboardNavigation', (selector = 'body') => {
  cy.get(selector).first().focus()
  cy.focused().should('exist')
  
  // Test Tab navigation
  cy.get('body').tab()
  cy.focused().should('exist')
  
  // Test Shift+Tab navigation
  cy.get('body').tab({ shift: true })
  cy.focused().should('exist')
  
  // Test Enter key on buttons
  cy.focused().type('{enter}')
  
  // Test Space key on buttons
  cy.focused().type(' ')
  
  // Test Escape key
  cy.focused().type('{esc}')
})

Cypress.Commands.add('checkAriaLabel', (selector, expectedLabel) => {
  cy.get(selector).should('have.attr', 'aria-label', expectedLabel)
})

Cypress.Commands.add('checkFocusManagement', (selector) => {
  cy.get(selector).should('be.visible')
  cy.get(selector).focus()
  cy.focused().should('have.attr', 'data-testid', selector.replace(/\[|\]|data-testid=/g, ''))
})

Cypress.Commands.add('checkScreenReaderAnnouncement', (expectedAnnouncement) => {
  cy.get('[role="status"], [aria-live="polite"], [aria-live="assertive"]')
    .should('contain', expectedAnnouncement)
})

// Custom accessibility checks for LipSyncAutomation components
Cypress.Commands.add('checkProfileAccessibility', () => {
  cy.checkComponentA11y('[data-testid="profile-manager"]')
  cy.checkAriaLabel('[data-testid="profile-selector"]', 'Select Profile')
  cy.checkKeyboardNavigation('[data-testid="profile-list"]')
})

Cypress.Commands.add('checkProcessingAccessibility', () => {
  cy.checkComponentA11y('[data-testid="processing-stages"]')
  cy.checkAriaLabel('[data-testid="progress-bar"]', 'Processing Progress')
  cy.checkScreenReaderAnnouncement('Processing started')
})

Cypress.Commands.add('checkVisualizationAccessibility', () => {
  cy.checkComponentA11y('[data-testid="emotion-timeline"]')
  cy.checkAriaLabel('[data-testid="emotion-heatmap"]', 'Emotion Intensity Heatmap')
  cy.checkColorContrast('[data-testid="legend-item"]')
})

Cypress.Commands.add('checkCinematographyAccessibility', () => {
  cy.checkComponentA11y('[data-testid="shot-sequence"]')
  cy.checkAriaLabel('[data-testid="shot-preview"]', 'Shot Preview')
  cy.checkKeyboardNavigation('[data-testid="shot-controls"]')
})

// Comprehensive accessibility audit
Cypress.Commands.add('runAccessibilityAudit', () => {
  cy.log('🔍 Running comprehensive accessibility audit')
  
  // Check main navigation
  cy.checkComponentA11y('[data-testid="navigation"]')
  
  // Check main content areas
  cy.checkA11y('main')
  
  // Check forms
  cy.checkA11y('form')
  
  // Check interactive elements
  cy.checkA11y('button, input, select, textarea')
  
  // Check tables
  cy.checkA11y('table')
  
  // Check modal dialogs
  cy.get('[role="dialog"]').each(($dialog) => {
    cy.checkComponentA11y($dialog)
  })
  
  // Check custom components
  cy.checkProfileAccessibility()
  cy.checkProcessingAccessibility()
  cy.checkVisualizationAccessibility()
  cy.checkCinematographyAccessibility()
  
  cy.log('✅ Accessibility audit completed')
})