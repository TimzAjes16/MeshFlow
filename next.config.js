/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Server Actions are available by default in Next.js 14+, no need for experimental flag
  
  // Next.js automatically handles /_next/static routes for static assets
  // The middleware.ts file ensures these routes are not intercepted
}

module.exports = nextConfig
