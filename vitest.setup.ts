import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

// Load .env from the workspace root for both unit and integration runs.
// CI sets these via the runner so .env may not exist — loading is best-effort.
loadDotenv({ path: resolve(import.meta.dirname, '.env'), quiet: true });
