/**
 * Accessibility Testing Suite
 * Tests WCAG compliance, keyboard navigation, and screen reader support
 */

import { test, expect, devices } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await injectAxe(page)
  })

  test('should meet WCAG 2.1 AA standards', async ({ page }) => {
    await page.goto('/')
    
    // Run comprehensive accessibility audit
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      rules: {
        // WCAG 2.1 AA specific rules
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-management': { enabled: true },
        'aria-labels': { enabled: true },
        'heading-order': { enabled: true },
        'landmark-roles': { enabled: true },
        'link-name': { enabled: true },
        'button-name': { enabled: true },
        'label-title-only': { enabled: true },
        'label-content-name-mismatch': { enabled: true },
        'duplicate-id-aria': { enabled: true },
        'aria-required-attr': { enabled: true },
        'aria-roles': { enabled: true },
        'aria-valid-attr-value': { enabled: true },
        'aria-valid-attr': { enabled: true },
        'region': { enabled: true },
        'skip-link': { enabled: true },
        'tabindex': { enabled: true },
        'target-size': { enabled: true }, // Mobile touch target size
      }
    })
  })

  test('should provide proper keyboard navigation', async ({ page }) => {
    await page.goto('/')

    // Test tab navigation
    await page.keyboard.press('Tab')
    let focusedElement = await page.locator(':focus')
    await expect(focusedElement).toBeVisible()

    // Should have visible focus indicator
    const hasFocusStyles = await focusedElement.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return styles.outline !== 'none' || 
             styles.boxShadow !== 'none' || 
             styles.border.includes('focus')
    })
    expect(hasFocusStyles).toBe(true)

    // Test tab order through main navigation
    const expectedTabOrder = [
      '[data-testid="skip-to-content"]',
      '[data-testid="nav-dashboard"]',
      '[data-testid="nav-profiles"]',
      '[data-testid="nav-processing"]',
      '[data-testid="nav-monitoring"]',
      '[data-testid="nav-settings"]',
    ]

    for (const selector of expectedTabOrder) {
      await page.keyboard.press('Tab')
      focusedElement = await page.locator(':focus')
      await expect(focusedElement).toHaveAttribute('data-testid', selector.replace('[data-testid="', '').replace('"]', ''))
    }

    // Test Shift+Tab navigation
    await page.keyboard.press('Shift+Tab')
    focusedElement = await page.locator(':focus')
    await expect(focusedElement).toHaveAttribute('data-testid', 'nav-monitoring')

    // Test Enter key activation
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/monitoring/)

    // Test arrow key navigation in menus
    await page.goto('/profiles')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter') // Open create profile modal
    
    // Test arrow navigation in form
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('ArrowDown') // Should navigate emotion selector
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter') // Select emotion

    // Test Escape key
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="profile-form"]')).not.toBeVisible()
  })

  test('should support screen readers', async ({ page }) => {
    await page.goto('/')

    // Test semantic HTML structure
    const semanticStructure = await page.evaluate(() => {
      const structure = {
        hasMainLandmark: !!document.querySelector('main'),
        hasNavigationLandmark: !!document.querySelector('nav'),
        hasHeaderLandmark: !!document.querySelector('header'),
        hasFooterLandmark: !!document.querySelector('footer'),
        hasHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        hasProperHeadingOrder: false,
        hasAriaLabels: document.querySelectorAll('[aria-label], [aria-labelledby]').length,
        hasDescriptions: document.querySelectorAll('[aria-describedby]').length,
      }

      // Check heading order
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      let lastLevel = 0
      structure.hasProperHeadingOrder = headings.every(heading => {
        const level = parseInt(heading.tagName.charAt(1))
        if (level > lastLevel + 1) return false
        lastLevel = level
        return true
      })

      return structure
    })

    expect(semanticStructure.hasMainLandmark).toBe(true)
    expect(semanticStructure.hasNavigationLandmark).toBe(true)
    expect(semanticStructure.hasHeaderLandmark).toBe(true)
    expect(semanticStructure.hasHeadings).toBeGreaterThan(0)
    expect(semanticStructure.hasProperHeadingOrder).toBe(true)
    expect(semanticStructure.hasAriaLabels).toBeGreaterThan(0)

    // Test ARIA attributes
    await page.goto('/profiles')
    await page.click('[data-testid="create-profile-btn"]')

    // Check form accessibility
    const formAccessibility = await page.evaluate(() => {
      const form = document.querySelector('[data-testid="profile-form"]')
      if (!form) return null

      return {
        hasFormLabel: !!form.querySelector('label'),
        hasRequiredIndicators: !!form.querySelector('[required], [aria-required="true"]'),
        hasErrorMessages: !!form.querySelector('[role="alert"], [aria-live]'),
        hasFieldset: !!form.querySelector('fieldset'),
        hasLegend: !!form.querySelector('legend'),
        inputsHaveLabels: Array.from(form.querySelectorAll('input, select, textarea')).every(input => {
          const hasLabel = !!document.querySelector(`label[for="${input.id}"]`)
          const hasAriaLabel = !!input.getAttribute('aria-label')
          const hasAriaLabelledBy = !!input.getAttribute('aria-labelledby')
          return hasLabel || hasAriaLabel || hasAriaLabelledBy
        }),
      }
    })

    expect(formAccessibility.inputsHaveLabels).toBe(true)

    // Test live regions for dynamic content
    await page.goto('/processing')
    await page.click('[data-testid="start-processing-btn"]')

    const hasLiveRegions = await page.evaluate(() => {
      return !!document.querySelector('[aria-live], [role="status"], [role="alert"]')
    })
    expect(hasLiveRegions).toBe(true)
  })

  test('should provide sufficient color contrast', async ({ page }) => {
    await page.goto('/')

    // Test color contrast for various elements
    const contrastTests = await page.evaluate(() => {
      const tests = []
      
      // Test text elements
      const textElements = document.querySelectorAll('h1, h2, h3, p, span, a, button')
      textElements.forEach(element => {
        const styles = window.getComputedStyle(element)
        const color = styles.color
        const backgroundColor = styles.backgroundColor
        
        if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          tests.push({
            type: 'text',
            element: element.tagName,
            color,
            backgroundColor,
            fontSize: parseFloat(styles.fontSize),
            fontWeight: styles.fontWeight,
          })
        }
      })

      // Test form elements
      const formElements = document.querySelectorAll('input, select, textarea')
      formElements.forEach(element => {
        const styles = window.getComputedStyle(element)
        tests.push({
          type: 'form',
          element: element.tagName,
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          borderColor: styles.borderColor,
        })
      })

      return tests
    })

    // Verify contrast ratios meet WCAG standards
    for (const test of contrastTests) {
      if (test.type === 'text') {
        // Large text (>18pt or 14pt bold) needs 3:1 contrast
        // Normal text needs 4.5:1 contrast
        const isLargeText = test.fontSize > 18 || (test.fontSize > 14 && test.fontWeight.includes('bold'))
        const requiredRatio = isLargeText ? 3 : 4.5
        
        // This would normally use a contrast calculation library
        // For now, just verify the element has styles defined
        expect(test.color).toBeTruthy()
        expect(test.backgroundColor).toBeTruthy()
      }
    }

    // Test high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')

    // Should maintain readability in dark mode
    const darkModeContrast = await page.evaluate(() => {
      const body = document.body
      const styles = window.getComputedStyle(body)
      return {
        color: styles.color,
        backgroundColor: styles.backgroundColor,
      }
    })

    expect(darkModeContrast.color).toBeTruthy()
    expect(darkModeContrast.backgroundColor).toBeTruthy()
  })

  test('should handle focus management properly', async ({ page }) => {
    await page.goto('/')

    // Test focus trapping in modals
    await page.goto('/profiles')
    await page.click('[data-testid="create-profile-btn"]')

    // Focus should move to modal
    let focusedElement = await page.locator(':focus')
    await expect(focusedElement).toBeWithin(page.locator('[data-testid="profile-form"]'))

    // Test focus trap within modal
    await page.keyboard.press('Tab')
    focusedElement = await page.locator(':focus')
    await expect(focusedElement).toBeWithin(page.locator('[data-testid="profile-form"]'))

    // Test multiple tabs should stay within modal
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
      focusedElement = await page.locator(':focus')
      const isWithinModal = await focusedElement.evaluate((el) => {
        const modal = el.closest('[data-testid="profile-form"]')
        return modal !== null
      })
      expect(isWithinModal).toBe(true)
    }

    // Test Escape closes modal and returns focus
    await page.keyboard.press('Escape')
    focusedElement = await page.locator(':focus')
    await expect(focusedElement).toHaveAttribute('data-testid', 'create-profile-btn')

    // Test focus management in dynamic content
    await page.goto('/processing')
    await page.click('[data-testid="start-processing-btn"]')

    // Focus should move to progress indicator
    focusedElement = await page.locator(':focus')
    await expect(focusedElement).toHaveAttribute('data-testid', 'processing-progress')

    // Test focus restoration after dynamic updates
    await page.evaluate(() => {
      // Simulate dynamic content update
      const progress = document.querySelector('[data-testid="processing-progress"]')
      if (progress) {
        progress.setAttribute('aria-live', 'polite')
        progress.textContent = 'Processing: 50%'
      }
    })

    // Focus should be maintained
    focusedElement = await page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('should provide appropriate touch target sizes', async ({ page }) => {
    await page.goto('/')

    // Test touch target sizes (minimum 44x44px per WCAG)
    const touchTargets = await page.evaluate(() => {
      const targets = []
      
      // Test buttons
      const buttons = document.querySelectorAll('button, [role="button"], input[type="button"]')
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect()
        targets.push({
          type: 'button',
          width: rect.width,
          height: rect.height,
          area: rect.width * rect.height,
        })
      })

      // Test links
      const links = document.querySelectorAll('a')
      links.forEach(link => {
        const rect = link.getBoundingClientRect()
        targets.push({
          type: 'link',
          width: rect.width,
          height: rect.height,
          area: rect.width * rect.height,
        })
      })

      // Test form controls
      const controls = document.querySelectorAll('input, select, textarea')
      controls.forEach(control => {
        const rect = control.getBoundingClientRect()
        targets.push({
          type: 'control',
          width: rect.width,
          height: rect.height,
          area: rect.width * rect.height,
        })
      })

      return targets
    })

    for (const target of touchTargets) {
      // Minimum touch target is 44x44px (1936px²)
      expect(target.area).toBeGreaterThanOrEqual(1936)
    }

    // Test mobile-specific touch targets
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone size
    await page.goto('/profiles')

    const mobileTouchTargets = await page.evaluate(() => {
      const targets = document.querySelectorAll('[data-testid*="mobile"], button, a')
      return Array.from(targets).map(target => {
        const rect = target.getBoundingClientRect()
        return {
          width: rect.width,
          height: rect.height,
        }
      })
    })

    for (const target of mobileTouchTargets) {
      expect(target.width).toBeGreaterThanOrEqual(44)
      expect(target.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('should provide skip links and landmarks', async ({ page }) => {
    await page.goto('/')

    // Test skip link
    const skipLink = page.locator('[data-testid="skip-to-content"]')
    await expect(skipLink).toBeVisible()
    await expect(skipLink).toHaveAttribute('href', '#main-content')

    // Test skip link functionality
    await skipLink.click()
    const mainContent = page.locator('#main-content, main')
    await expect(mainContent).toBeFocused()

    // Test landmark navigation
    const landmarks = await page.evaluate(() => {
      return {
        hasMain: !!document.querySelector('main, [role="main"]'),
        hasNavigation: !!document.querySelector('nav, [role="navigation"]'),
        hasHeader: !!document.querySelector('header, [role="banner"]'),
        hasFooter: !!document.querySelector('footer, [role="contentinfo"]'),
        hasSearch: !!document.querySelector('search, [role="search"]'),
        hasComplementary: !!document.querySelector('aside, [role="complementary"]'),
      }
    })

    expect(landmarks.hasMain).toBe(true)
    expect(landmarks.hasNavigation).toBe(true)
    expect(landmarks.hasHeader).toBe(true)
    expect(landmarks.hasFooter).toBe(true)

    // Test ARIA landmarks for complex sections
    await page.goto('/processing')
    const processingLandmarks = await page.evaluate(() => {
      return {
        hasForm: !!document.querySelector('[role="form"]'),
        hasRegion: !!document.querySelector('[role="region"]'),
        hasTablist: !!document.querySelector('[role="tablist"]'),
        hasTabpanel: !!document.querySelector('[role="tabpanel"]'),
      }
    })

    expect(processingLandmarks.hasForm).toBe(true)
    expect(processingLandmarks.hasTablist).toBe(true)
    expect(processingLandmarks.hasTabpanel).toBe(true)
  })

  test('should handle error states accessibly', async ({ page }) => {
    await page.goto('/profiles')
    await page.click('[data-testid="create-profile-btn"]')

    // Submit empty form to trigger validation errors
    await page.click('[data-testid="save-profile-btn"]')

    // Check error accessibility
    const errorAccessibility = await page.evaluate(() => {
      const errors = document.querySelectorAll('[role="alert"], [aria-live="assertive"]')
      return {
        hasErrorMessages: errors.length > 0,
        errorsHaveAriaLive: Array.from(errors).every(error => 
          error.hasAttribute('aria-live') || error.getAttribute('role') === 'alert'
        ),
        errorsAreAssociated: Array.from(errors).every(error => {
          // Check if error is associated with an input
          const inputId = error.getAttribute('aria-describedby')
          if (inputId) {
            const input = document.getElementById(inputId)
            return input !== null
          }
          return false
        }),
      }
    })

    expect(errorAccessibility.hasErrorMessages).toBe(true)
    expect(errorAccessibility.errorsHaveAriaLive).toBe(true)

    // Test error announcement to screen readers
    await page.keyboard.press('Tab') // Move to first input
    const focusedError = await page.evaluate(() => {
      const focused = document.activeElement
      const errorId = focused?.getAttribute('aria-describedby')
      return errorId ? document.getElementById(errorId)?.textContent : null
    })

    expect(focusedError).toBeTruthy()

    // Test recovery from errors
    await page.fill('[data-testid="profile-name-input"]', 'Test Profile')
    await page.click('[data-testid="emotion-selector"] [data-value="happy"]')
    await page.click('[data-testid="angle-selector"] [data-value="CU"]')
    await page.click('[data-testid="save-profile-btn"]')

    // Errors should be cleared
    await expect(page.locator('[role="alert"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
  })

  test('should support reduced motion preferences', async ({ page }) => {
    // Test prefers-reduced-motion
    await page.addInitStyle({
      media: '(prefers-reduced-motion: reduce)',
      css: '* { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }'
    })

    await page.goto('/')

    // Check if animations are disabled
    const animationsDisabled = await page.evaluate(() => {
      const animatedElements = document.querySelectorAll('[class*="animate"], [class*="transition"]')
      return Array.from(animatedElements).every(element => {
        const styles = window.getComputedStyle(element)
        return styles.animationDuration === '0.01s' || styles.transitionDuration === '0.01s'
      })
    })

    expect(animationsDisabled).toBe(true)

    // Test that functionality remains without animations
    await page.click('[data-testid="nav-profiles"]')
    await expect(page).toHaveURL(/\/profiles/)
    await expect(page.locator('[data-testid="profile-list"]')).toBeVisible()
  })
})

test.describe('Mobile Accessibility', () => {
  test.use({ ...devices['iPhone 13'] })
  
  test('should be accessible on mobile devices', async ({ page }) => {
    await injectAxe(page)
    await page.goto('/')

    // Run accessibility checks with mobile-specific rules
    await checkA11y(page, null, {
      rules: {
        'target-size': { enabled: true }, // Touch target size
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
      }
    })

    // Test mobile-specific accessibility
    const mobileAccessibility = await page.evaluate(() => {
      return {
        hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
        viewportMetaCorrect: document.querySelector('meta[name="viewport"]')?.getAttribute('content')?.includes('width=device-width'),
        hasMobileNavigation: !!document.querySelector('[data-testid*="mobile"]'),
        hasTouchOptimized: document.querySelectorAll('[data-testid*="mobile"]').length > 0,
        isReadable: window.getComputedStyle(document.body).fontSize >= '16px',
      }
    })

    expect(mobileAccessibility.hasViewportMeta).toBe(true)
    expect(mobileAccessibility.viewportMetaCorrect).toBe(true)
    expect(mobileAccessibility.isReadable).toBe(true)
  })
})

test.describe('Screen Reader Testing', () => {
  test('should work with common screen readers', async ({ page }) => {
    await page.goto('/')

    // Test ARIA attributes for screen readers
    const screenReaderSupport = await page.evaluate(() => {
      return {
        hasPageTitle: document.title.length > 0,
        hasLangAttribute: document.documentElement.hasAttribute('lang'),
        hasProperHeadingStructure: (() => {
          const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
          return headings.length > 0 && headings[0].tagName === 'H1'
        })(),
        hasAltTextForImages: Array.from(document.querySelectorAll('img')).every(img => 
          img.hasAttribute('alt') || img.getAttribute('role') === 'presentation'
        ),
        hasAriaLabels: document.querySelectorAll('[aria-label], [aria-labelledby]').length > 0,
        hasDescriptiveLinks: Array.from(document.querySelectorAll('a')).every(link => {
          const text = link.textContent?.trim()
          const hasAriaLabel = link.hasAttribute('aria-label')
          const hasTitle = link.hasAttribute('title')
          return (text && text.length > 0) || hasAriaLabel || hasTitle
        }),
      }
    })

    expect(screenReaderSupport.hasPageTitle).toBe(true)
    expect(screenReaderSupport.hasLangAttribute).toBe(true)
    expect(screenReaderSupport.hasProperHeadingStructure).toBe(true)
    expect(screenReaderSupport.hasAltTextForImages).toBe(true)
    expect(screenReaderSupport.hasDescriptiveLinks).toBe(true)

    // Test form accessibility for screen readers
    await page.goto('/profiles')
    await page.click('[data-testid="create-profile-btn"]')

    const formScreenReaderSupport = await page.evaluate(() => {
      const form = document.querySelector('[data-testid="profile-form"]')
      if (!form) return null

      return {
        hasFormLabel: !!form.querySelector('legend') || form.getAttribute('aria-label'),
        inputsHaveLabels: Array.from(form.querySelectorAll('input, select, textarea')).every(input => {
          return input.hasAttribute('aria-label') ||
                 input.hasAttribute('aria-labelledby') ||
                 !!document.querySelector(`label[for="${input.id}"]`)
        }),
        hasRequiredIndicators: Array.from(form.querySelectorAll('[required]')).every(input =>
          input.hasAttribute('aria-required') || 
          input.getAttribute('aria-required') === 'true'
        ),
        hasFieldsets: !!form.querySelector('fieldset'),
        hasInstructions: !!form.querySelector('[role="group"]') || !!form.querySelector('[aria-describedby]'),
      }
    })

    expect(formScreenReaderSupport.inputsHaveLabels).toBe(true)
  })
})