/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // Remove static export since we need to make API calls to backend
  trailingSlash: true, // Add trailing slashes to URLs
  reactStrictMode: true,
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Experimental features for performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'recharts'],
    workerThreads: false,
  },
  
  // Turbopack configuration (empty to silence warning)
  turbopack: {},
  
  // Server external packages (moved from experimental)
  serverExternalPackages: ['d3'],
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  
  // Bundle optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Tree shaking optimizations
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;
    
    // Split chunks for better caching
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true,
        },
        visualization: {
          test: /[\\/]node_modules[\\/](d3|recharts)[\\/]/,
          name: 'visualization',
          chunks: 'all',
          priority: 15,
        },
      },
    };
    
    // Performance budgets
    if (!dev && !isServer) {
      config.performance = {
        maxAssetSize: 244 * 1024, // 244KB
        maxEntrypointSize: 244 * 1024, // 244KB
        hints: 'warning',
      };
    }
    
    return config;
  },
  
  // Add proxy configuration to handle API requests (excluding WebSocket)
  async rewrites() {
    // Use environment variable to determine backend URL, default to localhost for development
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8002';
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`, // Proxy to backend with configurable URL
      },
      {
        source: '/upload',
        destination: `${backendUrl}/upload`, // Proxy upload endpoint
      },
    ];
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Redirects for SEO and performance
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);