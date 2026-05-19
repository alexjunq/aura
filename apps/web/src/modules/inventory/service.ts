import { prisma, MaterialPriceSource } from '@aura/db';
import { errors } from '@/shared/api-errors';
import * as materials from '@/modules/materials/service';
import * as repo from './repo.js';
import type { RecordAdjustmentInput, RecordPurchaseInput } from './schema.js';
import type { MovementRow, StockRow } from './repo.js';

export type { MovementRow, StockRow };

/**
 * Record a purchase (stock incoming). Single transaction:
 *   1. Verify the material + supplier both belong to the tenant.
 *   2. Insert an `inventory_movement` row (kind=purchase, quantity > 0,
 *      cost details).
 *   3. Also insert a `material_price` row (source='supplier', supplier_id,
 *      price_per_unit=unitCost, currency, fxRateToBase, effectiveAt=occurredAt).
 *      That way every purchase observation feeds the "current prices" view
 *      that the cost-breakdown reads from.
 */
export async function recordPurchase(
  tenantId: string,
  userId: string,
  input: RecordPurchaseInput,
): Promise<MovementRow> {
  return prisma.$transaction(async (tx) => {
    const material = await tx.material.findFirst({
      where: { id: input.materialId, tenantId },
      select: { id: true },
    });
    if (!material) throw errors.notFound(`material ${input.materialId} not found`);

    const supplier = await tx.supplier.findFirst({
      where: { id: input.supplierId, tenantId },
      select: { id: true },
    });
    if (!supplier) throw errors.notFound(`supplier ${input.supplierId} not found`);

    const movement = await repo.insertPurchaseMovement(tx, {
      tenantId,
      materialId: input.materialId,
      supplierId: input.supplierId,
      quantity: input.quantity,
      unitCost: input.unitCost,
      currency: input.currency,
      fxRateToBase: input.fxRateToBase,
      occurredAt: input.occurredAt,
      reference: input.reference ?? null,
      userId,
    });

    // Mirror as a supplier-source material_price so current-prices picks it up.
    await tx.materialPrice.create({
      data: {
        tenantId,
        materialId: input.materialId,
        source: MaterialPriceSource.supplier,
        supplierId: input.supplierId,
        pricePerUnit: input.unitCost,
        currency: input.currency,
        fxRateToBase: input.fxRateToBase,
        effectiveAt: input.occurredAt,
        createdByUserId: userId,
      },
    });

    return movement;
  });
}

export async function recordAdjustment(
  tenantId: string,
  userId: string,
  input: RecordAdjustmentInput,
): Promise<MovementRow> {
  return prisma.$transaction(async (tx) => {
    const material = await tx.material.findFirst({
      where: { id: input.materialId, tenantId },
      select: { id: true },
    });
    if (!material) throw errors.notFound(`material ${input.materialId} not found`);
    return repo.insertAdjustmentMovement(tx, {
      tenantId,
      materialId: input.materialId,
      quantity: input.quantity,
      reference: input.reference,
      occurredAt: input.occurredAt,
      userId,
    });
  });
}

export async function listMovements(
  tenantId: string,
  materialId?: string,
): Promise<MovementRow[]> {
  if (materialId) {
    // Tenant-scope guard.
    await materials.get(tenantId, materialId);
  }
  return repo.listMovements(tenantId, { materialId });
}

export interface InventoryReportRow {
  materialId: string;
  name: string;
  unit: string;
  kind: string;
  onHand: string;
}

/**
 * Final inventory report: every active material in the tenant, with its
 * current stock on hand (zero if no movements exist yet). Sorted by name.
 */
export async function currentInventory(tenantId: string): Promise<InventoryReportRow[]> {
  const [materialsList, stock] = await Promise.all([
    materials.list(tenantId, false), // active only
    repo.getCurrentStock(tenantId),
  ]);
  const stockMap = new Map(stock.map((s) => [s.materialId, s.onHand] as const));
  return materialsList
    .map((m) => ({
      materialId: m.id,
      name: m.name,
      unit: m.unit,
      kind: m.kind,
      onHand: stockMap.get(m.id) ?? '0',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export { repo as _repo };
