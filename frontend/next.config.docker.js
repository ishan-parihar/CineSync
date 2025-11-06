/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export since we need to make API calls to backend
  trailingSlash: true, // Add trailing slashes to URLs
  reactStrictMode: true,
  // Add proxy configuration to handle API requests in Docker
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:8001/api/:path*', // Proxy to backend service in Docker
      },
      {
        source: '/upload',
        destination: 'http://backend:8001/upload', // Proxy upload endpoint
      },
      {
        source: '/ws/:path*',
        destination: 'http://backend:8001/ws/:path*', // Proxy websocket endpoint
      },
    ]
  }

};

module.exports = nextConfig;