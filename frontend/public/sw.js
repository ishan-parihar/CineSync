// Service Worker for LipSyncAutomation - PWA functionality and offline support

const CACHE_NAME = 'lipsync-automation-v1'
const STATIC_CACHE_NAME = 'lipsync-static-v1'
const DYNAMIC_CACHE_NAME = 'lipsync-dynamic-v1'

// Files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/_next/static/css/',
  '/_next/static/chunks/',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// API endpoints to cache for offline functionality
const CACHEABLE_API_ENDPOINTS = [
  '/api/profiles',
  '/api/presets',
  '/api/settings',
]

// Performance monitoring
const performanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  networkRequests: 0,
  offlineRequests: 0,
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing')
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('✅ Static assets cached successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('❌ Failed to cache static assets:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('✅ Service Worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip external requests (except CDN)
  if (!url.origin.includes(self.location.origin) && 
      !url.hostname.includes('cdn.') && 
      !url.hostname.includes('jsdelivr') &&
      !url.hostname.includes('unpkg')) {
    return
  }
  
  // Handle different request types
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
  } else if (url.pathname.startsWith('/_next/static/') || 
             url.pathname.includes('.js') || 
             url.pathname.includes('.css')) {
    event.respondWith(handleStaticAsset(request))
  } else {
    event.respondWith(handlePageRequest(request))
  }
})

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url)
  
  try {
    // Try network first for API requests
    const networkResponse = await fetch(request)
    performanceMetrics.networkRequests++
    
    // Cache successful GET responses
    if (networkResponse.ok && CACHEABLE_API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('📴 Network failed, trying cache for:', request.url)
    performanceMetrics.offlineRequests++
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      performanceMetrics.cacheHits++
      return cachedResponse
    }
    
    // Return offline response for cacheable endpoints
    if (CACHEABLE_API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'No network connection',
          cached: false 
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    throw error
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    performanceMetrics.cacheHits++
    
    // Update cache in background
    fetch(request).then((response) => {
      if (response.ok) {
        const cache = caches.open(STATIC_CACHE_NAME)
        cache.then((c) => c.put(request, response))
      }
    })
    
    return cachedResponse
  }
  
  performanceMetrics.cacheMisses++
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.error('❌ Failed to fetch static asset:', request.url)
    throw error
  }
}

// Handle page requests with network-first, cache-fallback strategy
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request)
    performanceMetrics.networkRequests++
    
    // Cache page responses
    const cache = await caches.open(DYNAMIC_CACHE_NAME)
    cache.put(request, networkResponse.clone())
    
    return networkResponse
  } catch (error) {
    console.log('📴 Network failed for page, trying cache')
    performanceMetrics.offlineRequests++
    
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      performanceMetrics.cacheHits++
      return cachedResponse
    }
    
    // Return offline page
    const offlineResponse = await caches.match('/offline')
    if (offlineResponse) {
      return offlineResponse
    }
    
    // Fallback offline response
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - LipSyncAutomation</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
            .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
            .offline-message { color: #666; margin-bottom: 2rem; }
            .retry-button { 
              background: #0070f3; 
              color: white; 
              border: none; 
              padding: 0.5rem 1rem; 
              border-radius: 4px; 
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div class="offline-icon">📱</div>
          <h1>You're Offline</h1>
          <p class="offline-message">
            Please check your internet connection and try again.
          </p>
          <button class="retry-button" onclick="window.location.reload()">
            Retry
          </button>
        </body>
      </html>
      `,
      {
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag)
  
  if (event.tag === 'background-sync-profiles') {
    event.waitUntil(syncProfiles())
  } else if (event.tag === 'background-sync-settings') {
    event.waitUntil(syncSettings())
  }
})

// Sync profiles when back online
async function syncProfiles() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME)
    const keys = await cache.keys()
    
    for (const request of keys) {
      if (request.url.includes('/api/profiles') && request.method === 'POST') {
        // Sync POST requests that failed while offline
        console.log('🔄 Syncing profile:', request.url)
        // Implementation would depend on your specific sync logic
      }
    }
  } catch (error) {
    console.error('❌ Failed to sync profiles:', error)
  }
}

// Sync settings when back online
async function syncSettings() {
  try {
    // Similar implementation for settings sync
    console.log('🔄 Syncing settings')
  } catch (error) {
    console.error('❌ Failed to sync settings:', error)
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received')
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from LipSyncAutomation',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore',
        icon: '/images/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/images/xmark.png'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification('LipSyncAutomation', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification click received')
  
  event.notification.close()
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Performance monitoring and cleanup
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_PERFORMANCE_METRICS') {
    event.ports[0].postMessage(performanceMetrics)
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(DYNAMIC_CACHE_NAME).then(() => {
        event.ports[0].postMessage({ success: true })
      })
    )
  }
})

// Periodic cache cleanup (every 24 hours)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(cleanupCache())
  }
})

async function cleanupCache() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME)
    const requests = await cache.keys()
    const now = Date.now()
    
    // Remove entries older than 7 days
    const oldRequests = requests.filter(request => {
      const response = cache.match(request)
      return response && (now - response.date) > 7 * 24 * 60 * 60 * 1000
    })
    
    await Promise.all(oldRequests.map(request => cache.delete(request)))
    console.log(`🧹 Cleaned up ${oldRequests.length} old cache entries`)
  } catch (error) {
    console.error('❌ Cache cleanup failed:', error)
  }
}

// Performance optimization: preload critical resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/_next/static/css/app/layout.css',
        '/_next/static/chunks/webpack.js',
        '/_next/static/chunks/framework.js',
        '/_next/static/chunks/main.js',
        '/_next/static/chunks/pages/_app.js',
        '/_next/static/chunks/pages/_document.js',
      ])
    })
  )
})