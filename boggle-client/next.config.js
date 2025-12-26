/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Required for Azure Static Web Apps
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;

