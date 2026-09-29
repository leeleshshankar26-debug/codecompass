/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

// When deploying to GitHub Pages, set NEXT_PUBLIC_BASE_PATH to your repo name
// e.g. NEXT_PUBLIC_BASE_PATH=/codecompass
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  // Static export — required for GitHub Pages
  output: 'export',

  // Trailing slash for GitHub Pages compatibility
  trailingSlash: true,

  // Base path for GitHub Pages subpath (e.g. /codecompass)
  basePath,

  // Asset prefix must match basePath
  assetPrefix: basePath ? `${basePath}/` : '',

  // Disable image optimization (not available in static export)
  images: {
    unoptimized: true,
  },

  // TypeScript and ESLint checks during build
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
