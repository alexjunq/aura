import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

// Load .env from the workspace root for both unit and integration runs.
// CI doesn't ship a .env — loading is best-effort.
loadDotenv({ path: resolve(import.meta.dirname, '.env'), quiet: true });

// Tests always use the fake email provider so we don't depend on mailhog/Resend.
process.env.EMAIL_PROVIDER = 'fake';

/**
 * Fill in safe, obviously-fake defaults for every env var the runtime config
 * schema requires, but only when the variable isn't already set. This keeps
 * local dev unaffected (.env always wins because dotenv just ran) and removes
 * the need for CI to re-declare each one — the integration tests don't
 * actually exercise S3 / Resend / Google OAuth, they just need loadEnv() to
 * stop throwing at the boundary.
 */
const TEST_DEFAULTS: Record<string, string> = {
  NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret-test-secret-1234',
  NEXTAUTH_URL: 'http://localhost:3000',
  EMAIL_FROM: 'noreply@aura.test',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_PUBLIC_URL: 'http://localhost:9000',
  S3_BUCKET: 'aura-test',
  S3_ACCESS_KEY: 'test-key',
  S3_SECRET_KEY: 'test-secret',
  S3_FORCE_PATH_STYLE: 'true',
  S3_REGION: 'us-east-1',
  COMMODITY_PROVIDER: 'fake',
  FX_PROVIDER: 'fake',
};
for (const [key, value] of Object.entries(TEST_DEFAULTS)) {
  if (!process.env[key]) process.env[key] = value;
}
