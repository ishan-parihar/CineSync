/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export since we need to make API calls to backend
  trailingSlash: true, // Add trailing slashes to URLs
  reactStrictMode: true,
  // Add proxy configuration to handle API requests
  async rewrites() {
    // Use environment variable to determine backend URL, default to localhost for development
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8001';
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`, // Proxy to backend with configurable URL
      },
      {
        source: '/upload',
        destination: `${backendUrl}/upload`, // Proxy upload endpoint
      },
      {
        source: '/ws/:path*',
        destination: `${backendUrl}/ws/:path*`, // Proxy websocket endpoint
      },
    ]
  }

};

module.exports = nextConfig;