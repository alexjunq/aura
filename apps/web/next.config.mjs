import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load .env from the workspace root so build + dev share one source.
loadDotenv({ path: resolve(__dirname, '../../.env'), quiet: true });

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: [
    '@aura/config',
    '@aura/db',
    '@aura/domain',
    '@aura/email',
    '@aura/files',
    '@aura/logger',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
  // Allow `import './foo.js'` to resolve to `./foo.ts` — same code works
  // under Node ESM (worker) and Next's webpack bundler.
  webpack: (cfg) => {
    cfg.resolve = cfg.resolve ?? {};
    cfg.resolve.extensionAlias = {
      ...(cfg.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    return cfg;
  },
  output: 'standalone',
};

export default config;
