import { prisma, InventoryMovementKind } from '@aura/db';
import type { Prisma } from '@aura/db';

export interface MovementRow {
  id: string;
  materialId: string;
  kind: InventoryMovementKind;
  quantity: string;
  supplierId: string | null;
  unitCost: string | null;
  currency: string | null;
  fxRateToBase: string | null;
  pieceId: string | null;
  reference: string | null;
  occurredAt: Date;
  createdByUserId: string | null;
  createdAt: Date;
}

function toMovementRow(r: {
  id: string;
  materialId: string;
  kind: InventoryMovementKind;
  quantity: { toString: () => string };
  supplierId: string | null;
  unitCost: { toString: () => string } | null;
  currency: string | null;
  fxRateToBase: { toString: () => string } | null;
  pieceId: string | null;
  reference: string | null;
  occurredAt: Date;
  createdByUserId: string | null;
  createdAt: Date;
}): MovementRow {
  return {
    id: r.id,
    materialId: r.materialId,
    kind: r.kind,
    quantity: r.quantity.toString(),
    supplierId: r.supplierId,
    unitCost: r.unitCost ? r.unitCost.toString() : null,
    currency: r.currency,
    fxRateToBase: r.fxRateToBase ? r.fxRateToBase.toString() : null,
    pieceId: r.pieceId,
    reference: r.reference,
    occurredAt: r.occurredAt,
    createdByUserId: r.createdByUserId,
    createdAt: r.createdAt,
  };
}

export async function listMovements(
  tenantId: string,
  opts: { materialId?: string; limit?: number } = {},
): Promise<MovementRow[]> {
  const rows = await prisma.inventoryMovement.findMany({
    where: {
      tenantId,
      ...(opts.materialId ? { materialId: opts.materialId } : {}),
    },
    orderBy: { occurredAt: 'desc' },
    take: opts.limit ?? 200,
  });
  return rows.map(toMovementRow);
}

export interface StockRow {
  materialId: string;
  onHand: string;
}

/**
 * Current stock on hand per material, computed as SUM(quantity) over all
 * movements for the tenant. Materials with zero movements are not in the
 * result; the service joins these against the materials list to fill in zeros.
 */
export async function getCurrentStock(
  tenantId: string,
  materialId?: string,
): Promise<StockRow[]> {
  const rows = await prisma.inventoryMovement.groupBy({
    by: ['materialId'],
    where: {
      tenantId,
      ...(materialId ? { materialId } : {}),
    },
    _sum: { quantity: true },
  });
  return rows.map((r) => ({
    materialId: r.materialId,
    onHand: (r._sum.quantity ?? 0).toString(),
  }));
}

/**
 * Used internally by the inventory service inside a transaction. Exposed
 * separately so the pieces service can call it from within its own tx.
 */
export async function insertPurchaseMovement(
  tx: Prisma.TransactionClient,
  args: {
    tenantId: string;
    materialId: string;
    supplierId: string;
    quantity: string;
    unitCost: string;
    currency: string;
    fxRateToBase: string;
    occurredAt: Date;
    reference: string | null;
    userId: string;
  },
): Promise<MovementRow> {
  const row = await tx.inventoryMovement.create({
    data: {
      tenantId: args.tenantId,
      materialId: args.materialId,
      kind: InventoryMovementKind.purchase,
      quantity: args.quantity,
      supplierId: args.supplierId,
      unitCost: args.unitCost,
      currency: args.currency,
      fxRateToBase: args.fxRateToBase,
      pieceId: null,
      reference: args.reference,
      occurredAt: args.occurredAt,
      createdByUserId: args.userId,
    },
  });
  return toMovementRow(row);
}

export async function insertAdjustmentMovement(
  tx: Prisma.TransactionClient,
  args: {
    tenantId: string;
    materialId: string;
    quantity: string; // signed
    reference: string;
    occurredAt: Date;
    userId: string;
  },
): Promise<MovementRow> {
  const row = await tx.inventoryMovement.create({
    data: {
      tenantId: args.tenantId,
      materialId: args.materialId,
      kind: InventoryMovementKind.adjustment,
      quantity: args.quantity,
      supplierId: null,
      unitCost: null,
      currency: null,
      fxRateToBase: null,
      pieceId: null,
      reference: args.reference,
      occurredAt: args.occurredAt,
      createdByUserId: args.userId,
    },
  });
  return toMovementRow(row);
}

/**
 * Idempotent usage write: one row per (piece, material). Called from
 * pieces.addMaterial inside its transaction so stock decrements stay
 * in sync with piece_material rows.
 *
 * `quantity` is the positive amount used; this function negates it before
 * insert.
 */
export async function upsertUsageMovement(
  tx: Prisma.TransactionClient,
  args: { tenantId: string; materialId: string; pieceId: string; quantity: string; userId: string },
): Promise<MovementRow> {
  const negative = '-' + args.quantity.replace(/^-/, '');
  const row = await tx.inventoryMovement.upsert({
    where: {
      one_usage_per_piece_material: {
        pieceId: args.pieceId,
        materialId: args.materialId,
        kind: InventoryMovementKind.usage,
      },
    },
    create: {
      tenantId: args.tenantId,
      materialId: args.materialId,
      kind: InventoryMovementKind.usage,
      quantity: negative,
      pieceId: args.pieceId,
      occurredAt: new Date(),
      createdByUserId: args.userId,
    },
    update: { quantity: negative, occurredAt: new Date() },
  });
  return toMovementRow(row);
}

export async function deleteUsageMovement(
  tx: Prisma.TransactionClient,
  args: { tenantId: string; materialId: string; pieceId: string },
): Promise<void> {
  await tx.inventoryMovement.deleteMany({
    where: {
      tenantId: args.tenantId,
      pieceId: args.pieceId,
      materialId: args.materialId,
      kind: InventoryMovementKind.usage,
    },
  });
}
