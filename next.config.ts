/** @type {import('next').NextConfig} */
const nextConfig = {
  // CORS configuration (if needed for API routes)
  async headers() {
    return [
      {
        // Apply CORS to all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3000,http://localhost:3002' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
  
  // Environment variables that should be available on the client
  env: {
    // Add any public env vars here if needed
  },
};

module.exports = nextConfig;