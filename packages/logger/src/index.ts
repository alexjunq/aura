import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';
const level = process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info');

/**
 * Pino's `pino-pretty` transport spawns a worker thread that resolves its
 * own files by absolute path. Next.js's webpack bundles those paths into
 * `.next/server/vendor-chunks/`, and the spawned worker can't find itself
 * → MODULE_NOT_FOUND on `lib/worker.js` and the request handler crashes.
 *
 * Detect "running under Next.js" via `NEXT_RUNTIME` (set to "nodejs" or
 * "edge" by Next at request time, present at module init too) and just
 * skip the transport in that case. The web app then emits plain JSON
 * logs in dev too — same shape as prod. The worker process keeps the
 * pretty-printed output via the transport because there's no Next.js
 * to entangle.
 */
const isUnderNext = !!process.env.NEXT_RUNTIME;
const useTransport = isDev && !isUnderNext;

export const logger = pino({
  level,
  base: {
    service: process.env.SERVICE_NAME ?? 'aura',
  },
  redact: {
    paths: [
      'password',
      'hashedPassword',
      'token',
      'authorization',
      'cookie',
      '*.password',
      '*.token',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[redacted]',
  },
  ...(useTransport
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
});

export type Logger = typeof logger;
