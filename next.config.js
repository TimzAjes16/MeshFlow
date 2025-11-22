/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Server Actions are available by default in Next.js 14+, no need for experimental flag
  
  // Next.js automatically handles /_next/static routes for static assets
  // The middleware.ts file ensures these routes are not intercepted
  
  // For Electron, we'll run Next.js as a server (not static export)
  // This allows full server-side features (API routes, Server Components, etc.)
  images: {
    unoptimized: false,
  },
  
  // Enable standalone output for smaller Electron package
  output: process.env.ELECTRON_STANDALONE ? 'standalone' : undefined,
  
}

module.exports = nextConfig
