import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Load `.env` from the workspace root once, before anything else in the
 * worker boots. The web app does the equivalent in `next.config.mjs`; the
 * worker has no host framework, so we do it explicitly here.
 *
 * Side-effect import. Must be the FIRST import in `index.ts`.
 *
 * Errors from a missing `.env` are silenced — CI and prod set env vars
 * directly via Docker/compose. Validation happens later in `loadEnv()`.
 */
const here = fileURLToPath(new URL('.', import.meta.url));
loadDotenv({ path: resolve(here, '../../../.env'), quiet: true });
