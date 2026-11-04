import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../'),

  // Compression & security headers
  compress: process.env.NODE_ENV === "production",
  poweredByHeader: false,
  reactStrictMode: true,

  typescript: {
    ignoreBuildErrors: true,
  },

  // High-performance image optimization for mobile & desktop
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400, // Cache for 31 days to reduce bandwidth and server CPU
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    localPatterns: [
      {
        pathname: '/**',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },

  // Remove debug logs in production to reduce bundle size and memory
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  // Optimize package imports to tree-shake lucide-react and framer-motion
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-icons'],
  },
};

export default nextConfig;
