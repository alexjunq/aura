import { afterEach, describe, expect, it } from 'vitest';
import { loadEnv, resetEnvCache } from '../../index.js';

const validEnv = {
  DATABASE_URL: 'postgresql://u:p@h:5432/d',
  NEXTAUTH_SECRET: 'a'.repeat(48),
  NEXTAUTH_URL: 'http://localhost:3000',
  EMAIL_FROM: 'noreply@example.com',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_PUBLIC_URL: 'http://localhost:9000',
  S3_BUCKET: 'aura',
  S3_ACCESS_KEY: 'k',
  S3_SECRET_KEY: 's',
};

describe('loadEnv', () => {
  afterEach(() => {
    resetEnvCache();
  });

  it('parses a valid env', () => {
    const env = loadEnv(validEnv);
    expect(env.DATABASE_URL).toBe(validEnv.DATABASE_URL);
  });

  it('throws when required vars are missing', () => {
    expect(() => loadEnv({})).toThrow(/Invalid environment configuration/);
  });

  it("returns a stub during Next.js's build phase, even when all required vars are missing", () => {
    // Regression: docker build failed at "Collecting page data" because route
    // handlers transitively call loadEnv() at module top-level and the
    // builder stage doesn't have DATABASE_URL/NEXTAUTH_SECRET/etc. set.
    const env = loadEnv({ NEXT_PHASE: 'phase-production-build' });
    expect(env.NODE_ENV).toBe('production');
    expect(env.DATABASE_URL).toMatch(/^postgresql:\/\//);
    expect(env.NEXTAUTH_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  it('still throws outside the build phase even if NEXT_PHASE is some other Next.js value', () => {
    expect(() => loadEnv({ NEXT_PHASE: 'phase-development-server' })).toThrow(
      /Invalid environment configuration/,
    );
  });
});
