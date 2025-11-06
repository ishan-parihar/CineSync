import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright global setup')
  
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    // Wait for server to be ready
    await page.goto('http://localhost:3000')
    await page.waitForSelector('body', { timeout: 30000 })
    
    // Take baseline screenshots for visual regression testing
    const pages = [
      '/',
      '/profiles',
      '/process',
      '/cinematography',
      '/visualizations',
      '/settings',
    ]
    
    for (const pageUrl of pages) {
      try {
        await page.goto(pageUrl)
        await page.waitForLoadState('networkidle')
        
        // Wait for any dynamic content to load
        await page.waitForTimeout(2000)
        
        // Take full page screenshot
        await page.screenshot({
          path: `tests/visual/baselines${pageUrl.replace(/\//g, '_')}-baseline.png`,
          fullPage: true,
        })
        
        console.log(`✅ Baseline screenshot created for ${pageUrl}`)
      } catch (error) {
        console.warn(`⚠️ Could not create baseline for ${pageUrl}:`, error)
      }
    }
    
    // Setup test data
    await page.goto('/profiles')
    await page.waitForLoadState('networkidle')
    
    // Create test profiles if they don't exist
    const testProfiles = [
      { name: 'Test Profile 1', description: 'Visual regression test profile' },
      { name: 'Test Profile 2', description: 'Another test profile' },
    ]
    
    for (const profile of testProfiles) {
      try {
        // Check if profile already exists
        const existingProfile = await page.locator(`text=${profile.name}`).first()
        if (!(await existingProfile.isVisible())) {
          // Create new profile
          await page.locator('[data-testid="create-profile-button"]').click()
          await page.locator('[data-testid="profile-name-input"]').fill(profile.name)
          await page.locator('[data-testid="profile-description-input"]').fill(profile.description)
          await page.locator('[data-testid="save-profile-button"]').click()
          await page.waitForTimeout(1000)
        }
      } catch (error) {
        console.warn(`⚠️ Could not create test profile ${profile.name}:`, error)
      }
    }
    
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await context.close()
    await browser.close()
  }
  
  console.log('✅ Playwright global setup completed')
}

export default globalSetup