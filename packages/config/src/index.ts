import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),

  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),

  EMAIL_PROVIDER: z.enum(['resend', 'smtp', 'fake']).default('fake'),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email(),
  EMAIL_SMTP_HOST: z.string().optional(),
  EMAIL_SMTP_PORT: z.coerce.number().int().positive().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  S3_ENDPOINT: z.string().url(),
  S3_PUBLIC_URL: z.string().url(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),

  COMMODITY_PROVIDER: z.enum(['metals_dev', 'goldapi', 'fake']).default('fake'),
  COMMODITY_API_KEY: z.string().optional(),
  FX_PROVIDER: z.enum(['frankfurter', 'fake']).default('frankfurter'),

  WEB_PORT: z.coerce.number().int().positive().default(3000),
  WORKER_PORT: z.coerce.number().int().positive().default(3001),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * `NEXT_PHASE` is set by Next.js to one of a handful of well-known string
 * constants during its lifecycle. `phase-production-build` is what we see
 * during `next build`, including the "Collecting page data" step that
 * evaluates route-handler modules to harvest their exports.
 *
 * Route handlers like `app/api/auth/[...nextauth]/route.ts` end up
 * importing `loadEnv()` transitively at module top-level (via auth.ts),
 * so a build run that has no real DATABASE_URL/NEXTAUTH_SECRET/etc. would
 * otherwise throw at this step and fail the Docker image build.
 *
 * We detect that single phase and return a schema-shaped stub. Real
 * validation still fires at request time inside the runtime container,
 * which has the actual env vars supplied via `env_file: .env`.
 */
const NEXT_BUILD_PHASE = 'phase-production-build';

function buildStub(): Env {
  return envSchema.parse({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://build-stub:stub@build-stub:5432/stub',
    NEXTAUTH_SECRET: 'build-stub-secret-build-stub-secret-build-stub',
    NEXTAUTH_URL: 'http://build-stub',
    EMAIL_FROM: 'build@stub.test',
    EMAIL_PROVIDER: 'fake',
    S3_ENDPOINT: 'http://build-stub:9000',
    S3_PUBLIC_URL: 'http://build-stub:9000',
    S3_BUCKET: 'build-stub',
    S3_ACCESS_KEY: 'build-stub',
    S3_SECRET_KEY: 'build-stub',
    COMMODITY_PROVIDER: 'fake',
    FX_PROVIDER: 'fake',
  });
}

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(source);
  if (parsed.success) {
    cached = parsed.data;
    return cached;
  }
  if (source.NEXT_PHASE === NEXT_BUILD_PHASE) {
    cached = buildStub();
    return cached;
  }
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export function resetEnvCache(): void {
  cached = undefined;
}
