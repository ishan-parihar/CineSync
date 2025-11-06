import dynamic from 'next/dynamic'
import React, { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { Loader2 } from 'lucide-react'

// Loading component
const LoadingSpinner = ({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  }

  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className={`animate-spin text-blue-500 ${sizeClasses[size]}`} />
    </div>
  )
}

// Error boundary for lazy loaded components
const ErrorBoundary = ({ children, error }: { children: React.ReactNode; error?: Error }) => {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Component</h3>
        <p className="text-gray-600 mb-4">Something went wrong while loading this component.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }
  return <>{children}</>
}

// Lazy loaded components with Next.js dynamic imports
export const LazyProfileManager = dynamic(
  () => import('@/components/profile-manager/ProfileManager').then(mod => ({ default: mod.default })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false, // Disable server-side rendering for better performance
  }
)

export const LazyProcessingStages = dynamic(
  () => import('@/components/processing/ProcessingStagesIndicator'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
)

export const LazyEmotionTimeline = dynamic(
  () => import('@/components/visualization/EmotionTimeline'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
)

export const LazyEmotionHeatmap = dynamic(
  () => import('@/components/visualization/EmotionHeatmap'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
)

export const LazyCinematographyConfig = dynamic(
  () => import('@/components/cinematography/CinematographyConfig').then(mod => ({ default: mod.CinematographyConfigPanel })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
)

export const LazySystemPerformanceDashboard = dynamic(
  () => import('@/components/visualization/SystemPerformanceDashboard'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
)

export const LazyBatchQueueManager = dynamic(
  () => import('@/components/processing/BatchQueueManager'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
)

export const LazyInteractiveTimeline = dynamic(
  () => import('@/components/processing/InteractiveTimeline'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
)

export const LazyShotSequencePreview = dynamic(
  () => import('@/components/cinematography/ShotSequencePreview').then(mod => ({ default: mod.ShotSequencePreview })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
)

// React.lazy components for internal use
// const LazyChartComponent = lazy(() => import('@/components/charts/ChartComponent'))
// const LazyDataTable = lazy(() => import('@/components/ui/organisms/DataTable'))
// const LazyModal = lazy(() => import('@/components/ui/molecules/Modal'))

// Higher-order component for lazy loading with error handling
export function withLazyLoading<P extends object>(
  component: React.ComponentType<P>,
  fallback?: React.ComponentType
) {
  const LazyComponent = lazy(() => Promise.resolve({ default: component }))
  
  return function LazyWrapper(props: P) {
    return (
      <ErrorBoundary>
        <Suspense fallback={fallback ? React.createElement(fallback) : <LoadingSpinner />}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    )
  }
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  ref: React.RefObject<HTMLElement | HTMLVideoElement | null>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options,
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [ref, options])

  return isIntersecting
}

// Lazy image component
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  placeholder?: string
  className?: string
}

export function LazyImage({ src, alt, placeholder, className, ...props }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLDivElement | null>(null)

  useIntersectionObserver(imgRef)

  useEffect(() => {
    if (isInView && !isLoaded && !hasError) {
      const img = new Image()
      img.onload = () => setIsLoaded(true)
      img.onerror = () => setHasError(true)
      img.src = src
    }
  }, [isInView, isLoaded, hasError, src])

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {/* Placeholder */}
      {!isLoaded && !hasError && placeholder && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500">{placeholder}</span>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-red-50 flex items-center justify-center">
          <span className="text-red-500">Failed to load image</span>
        </div>
      )}

      {/* Actual image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          {...props}
        />
      )}
    </div>
  )
}

// Lazy video component
interface LazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string
  poster?: string
}

export function LazyVideo({ src, poster, className, ...props }: LazyVideoProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useIntersectionObserver(containerRef)

  useEffect(() => {
    if (isInView && videoRef.current && !isLoaded) {
      videoRef.current.load()
    }
  }, [isInView, isLoaded])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <video
        src={isInView ? src : undefined}
        poster={poster}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoadedData={() => setIsLoaded(true)}
        {...props}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}

// Lazy load route components
export const lazyLoadRoute = (componentPath: string) => {
  return dynamic(() => import(componentPath), {
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    ),
    ssr: false,
  })
}

// Preload critical components
export function preloadComponent(componentPath: string) {
  if (typeof window !== 'undefined') {
    import(componentPath).catch(err => {
      console.warn('Failed to preload component:', componentPath, err)
    })
  }
}

// Preload components based on user interaction
export function usePreloadOnInteraction(componentPath: string, trigger: 'hover' | 'focus' = 'hover') {
  const [hasPreloaded, setHasPreloaded] = useState(false)

  const handleInteraction = () => {
    if (!hasPreloaded) {
      preloadComponent(componentPath)
      setHasPreloaded(true)
    }
  }

  return {
    onMouseEnter: trigger === 'hover' ? handleInteraction : undefined,
    onFocus: trigger === 'focus' ? handleInteraction : undefined,
  }
}

// Virtual scrolling hook for large lists
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length - 1
  )

  const visibleItems = items.slice(visibleStart, visibleEnd + 1)
  const offsetY = visibleStart * itemHeight

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  return {
    visibleItems,
    offsetY,
    totalHeight: items.length * itemHeight,
    handleScroll,
  }
}

// Lazy load chart data
export function useLazyChartData<T>(fetchData: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    if (data || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchData()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [fetchData, data, isLoading])

  return { data, isLoading, error, loadData }
}

// Component for lazy loading heavy computations
export function LazyComputation<T>({
  compute,
  fallback,
  children,
}: {
  compute: () => Promise<T>
  fallback: React.ReactNode
  children: (result: T) => React.ReactNode
}) {
  const [result, setResult] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let isCancelled = false

    const performComputation = async () => {
      setIsLoading(true)
      try {
        const computationResult = await compute()
        if (!isCancelled) {
          setResult(computationResult)
        }
      } catch (error) {
        console.error('Computation failed:', error)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    performComputation()

    return () => {
      isCancelled = true
    }
  }, [compute])

  if (isLoading) {
    return <>{fallback}</>
  }

  if (result === null) {
    return <>{fallback}</>
  }

  return <>{children(result)}</>
}