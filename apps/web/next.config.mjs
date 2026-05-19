/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Allow Next.js to transpile shared workspace packages.
  transpilePackages: [
    '@aura/config',
    '@aura/db',
    '@aura/domain',
    '@aura/email',
    '@aura/files',
    '@aura/logger',
  ],
  experimental: {
    // Server actions are enabled by default in 15.
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
  // Output a standalone build for the Dockerfile.
  output: 'standalone',
};

export default config;
