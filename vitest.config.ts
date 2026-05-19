import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Single vitest config; unit vs integration is selected via the `VITEST_SCOPE`
 * env var (or the package scripts that set it).
 *
 * - unit: anything under `**\/__tests__/unit/**` or matching `*.unit.test.ts`.
 *   No DB, runs anywhere.
 * - integration: anything under `**\/__tests__/integration/**` or matching
 *   `*.int.test.ts`. Requires DATABASE_URL.
 */
const scope = process.env.VITEST_SCOPE ?? 'unit';
const here = fileURLToPath(new URL('.', import.meta.url));

const unitIncludes = ['**/__tests__/unit/**/*.test.ts', '**/*.unit.test.ts'];
const integrationIncludes = [
  '**/__tests__/integration/**/*.test.ts',
  '**/*.int.test.ts',
];

export default defineConfig({
  resolve: {
    alias: {
      '@/': `${resolve(here, 'apps/web/src')}/`,
    },
  },
  test: {
    include: scope === 'integration' ? integrationIncludes : unitIncludes,
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: scope === 'integration' ? 60_000 : 10_000,
    hookTimeout: 60_000,
    pool: scope === 'integration' ? 'forks' : 'threads',
    poolOptions: scope === 'integration' ? { forks: { singleFork: true } } : undefined,
  },
});
