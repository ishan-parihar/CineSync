import { test, expect } from '@playwright/test'

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport for visual tests
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('Dashboard page visual regression', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // Wait for animations

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Profiles page visual regression', async ({ page }) => {
    await page.goto('/profiles')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await expect(page).toHaveScreenshot('profiles.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Process page visual regression', async ({ page }) => {
    await page.goto('/process')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await expect(page).toHaveScreenshot('process.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Cinematography page visual regression', async ({ page }) => {
    await page.goto('/cinematography')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await expect(page).toHaveScreenshot('cinematography.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Visualizations page visual regression', async ({ page }) => {
    await page.goto('/visualizations')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000) // Wait for charts to render

    await expect(page).toHaveScreenshot('visualizations.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Mobile responsive visual tests', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone size
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Dark mode visual regression', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Enable dark mode
    await page.locator('[data-testid="theme-toggle"]').click()
    await page.waitForTimeout(1000)

    await expect(page).toHaveScreenshot('dashboard-dark.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('Component visual regression - Profile Card', async ({ page }) => {
    await page.goto('/profiles')
    await page.waitForLoadState('networkidle')
    
    const profileCard = page.locator('[data-testid="profile-card"]').first()
    await expect(profileCard).toBeVisible()

    await expect(profileCard).toHaveScreenshot('profile-card.png', {
      animations: 'disabled',
    })
  })

  test('Component visual regression - Navigation', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const navigation = page.locator('[data-testid="navigation"]')
    await expect(navigation).toBeVisible()

    await expect(navigation).toHaveScreenshot('navigation.png', {
      animations: 'disabled',
    })
  })

  test('Interactive states visual regression', async ({ page }) => {
    await page.goto('/profiles')
    await page.waitForLoadState('networkidle')
    
    // Hover state
    const createButton = page.locator('[data-testid="create-profile-button"]')
    await createButton.hover()
    await expect(createButton).toHaveScreenshot('create-button-hover.png', {
      animations: 'disabled',
    })

    // Focus state
    await createButton.focus()
    await expect(createButton).toHaveScreenshot('create-button-focus.png', {
      animations: 'disabled',
    })
  })

  test('Loading states visual regression', async ({ page }) => {
    await page.goto('/process')
    
    // Simulate loading state
    await page.route('**/api/**', route => {
      // Delay response to show loading state
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'loading' })
        })
      }, 2000)
    })

    await page.reload()
    await page.waitForTimeout(1000)

    const loadingSpinner = page.locator('[data-testid="loading-spinner"]')
    await expect(loadingSpinner).toBeVisible()

    await expect(loadingSpinner).toHaveScreenshot('loading-spinner.png', {
      animations: 'disabled',
    })
  })

  test('Error states visual regression', async ({ page }) => {
    await page.goto('/profiles')
    
    // Simulate error state
    await page.route('**/api/profiles', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      })
    })

    await page.reload()
    await page.waitForTimeout(1000)

    const errorMessage = page.locator('[data-testid="error-message"]')
    await expect(errorMessage).toBeVisible()

    await expect(errorMessage).toHaveScreenshot('error-message.png', {
      animations: 'disabled',
    })
  })
})