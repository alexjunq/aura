import { prisma } from '@aura/db';

/**
 * Truncate all domain tables in dependency order. Used in integration test
 * `beforeEach` hooks to give every test a clean slate.
 *
 * Add new tables to the list when migrations introduce them.
 */
export async function resetDb(): Promise<void> {
  await prisma.$transaction([
    prisma.pieceStatusHistory.deleteMany(),
    prisma.workSession.deleteMany(),
    prisma.pieceMaterial.deleteMany(),
    prisma.piece.deleteMany(),
    prisma.materialPrice.deleteMany(),
    prisma.supplierMaterial.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.material.deleteMany(),
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
