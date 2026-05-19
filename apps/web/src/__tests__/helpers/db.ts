import { prisma } from '@aura/db';

/**
 * Truncate all domain tables in dependency order. Used in integration test
 * `beforeEach` hooks to give every test a clean slate without dropping the
 * schema between tests.
 *
 * Add new tables to the list when migrations introduce them.
 */
export async function resetDb(): Promise<void> {
  // Order matters: children before parents.
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.tenant.deleteMany(),
  ]);
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
