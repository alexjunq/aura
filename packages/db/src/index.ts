import { PrismaClient } from '@prisma/client';

declare global {
  var __auraPrisma: PrismaClient | undefined;
}

function makeClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });
}

/// Singleton Prisma client. Reused across hot reloads in dev.
export const prisma: PrismaClient =
  globalThis.__auraPrisma ?? (globalThis.__auraPrisma = makeClient());

export * from '@prisma/client';
export type { PrismaClient } from '@prisma/client';
