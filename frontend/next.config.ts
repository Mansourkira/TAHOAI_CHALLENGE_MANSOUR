/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Added to help prevent hydration errors
  compiler: {
    styledComponents: true,
  },
  // Ensure correct export for Next.js
  swcMinify: true,
};

module.exports = nextConfig;
