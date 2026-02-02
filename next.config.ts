import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    // Enable CSS optimization
    optimizeCss: true,
    // Increase Server Action body size limit for file uploads (500MB)
    serverActions: {
      bodySizeLimit: '500mb',
    },
    // Optimize imports for heavy packages
    optimizePackageImports: ['lucide-react', 'framer-motion', 'katex', 'date-fns'],
  },
  // Standalone output for Docker/Self-hosting
  output: 'standalone',

  // Fix for workspace root warning
  turbopack: {
    root: process.cwd(),
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
