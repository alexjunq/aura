import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

// Load .env from the workspace root for both unit and integration runs.
// CI sets these via the runner so .env may not exist — loading is best-effort.
loadDotenv({ path: resolve(import.meta.dirname, '.env'), quiet: true });

// Tests always use the fake email provider so we don't depend on mailhog/Resend.
process.env.EMAIL_PROVIDER = 'fake';
