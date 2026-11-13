import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function supabaseImageHosts() {
  const hosts = new Set([
    'qxzwzqaipslfsieporti.supabase.co',
    'libngipioqzjoljmsosv.supabase.co',
  ]);
  const raw =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  try {
    if (raw) hosts.add(new URL(raw).hostname);
  } catch {
    /* ignore */
  }
  return [...hosts];
}

const imageHosts = supabaseImageHosts();

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,

  compress: process.env.NODE_ENV === "production",
  poweredByHeader: false,
  reactStrictMode: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400,
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    localPatterns: [
      {
        pathname: '/**',
      },
    ],
    remotePatterns: imageHosts.flatMap((hostname) => [
      { protocol: 'https', hostname, pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname, pathname: '/**' },
    ]),
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-icons'],
  },
};

export default nextConfig;
