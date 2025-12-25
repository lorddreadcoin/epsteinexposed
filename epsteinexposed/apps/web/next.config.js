/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable static optimization where possible
  poweredByHeader: false,
  
  // Compress responses
  compress: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  
  // Experimental features for performance
  experimental: {
    optimizePackageImports: ['three', '@react-three/fiber', '@react-three/drei', 'framer-motion', 'lucide-react'],
  },
  
  // Empty turbopack config to silence warning (Next.js 16 uses Turbopack by default)
  turbopack: {},
  
  // Note: API routes are handled by Next.js directly, no proxy needed
  // The old rewrite to localhost:3001 was breaking on Netlify
  
  // Headers for performance and caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        // Cache static assets aggressively (1 year)
        source: '/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache JS/CSS chunks (1 year - they have hashes)
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache images (30 days)
        source: '/:path*.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/:path*.jpg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/:path*.ico',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      {
        // Cache fonts (1 year)
        source: '/:path*.woff2',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache API graph data (5 minutes with stale-while-revalidate)
        source: '/api/graph',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, stale-while-revalidate=600' },
        ],
      },
      {
        // Cache document list (10 minutes)
        source: '/api/documents',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=600, stale-while-revalidate=1200' },
        ],
      },
    ];
  },
};

export default nextConfig;
