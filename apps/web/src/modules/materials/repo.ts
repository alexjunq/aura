import { prisma, MaterialKind, MaterialPriceSource } from '@aura/db';
import type {
  CreateMaterialInput,
  CreateManualPriceInput,
  UpdateMaterialInput,
} from './schema.js';

/**
 * Materials repo. Every function takes `tenantId` first. The Prisma calls
 * here are the *only* place that issues queries against `material` / `material_price`.
 */

export interface MaterialRow {
  id: string;
  name: string;
  unit: string;
  kind: MaterialKind;
  commoditySymbol: string | null;
  notes: string | null;
  active: boolean;
  lastFeedFetchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaterialPriceRow {
  id: string;
  materialId: string;
  source: MaterialPriceSource;
  supplierId: string | null;
  pricePerUnit: string;
  currency: string;
  fxRateToBase: string;
  effectiveAt: Date;
  createdByUserId: string | null;
}

function toMaterialRow(r: {
  id: string;
  name: string;
  unit: string;
  kind: MaterialKind;
  commoditySymbol: string | null;
  notes: string | null;
  active: boolean;
  lastFeedFetchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): MaterialRow {
  return { ...r };
}

function toPriceRow(r: {
  id: string;
  materialId: string;
  source: MaterialPriceSource;
  supplierId: string | null;
  pricePerUnit: { toString: () => string };
  currency: string;
  fxRateToBase: { toString: () => string };
  effectiveAt: Date;
  createdByUserId: string | null;
}): MaterialPriceRow {
  return {
    id: r.id,
    materialId: r.materialId,
    source: r.source,
    supplierId: r.supplierId,
    pricePerUnit: r.pricePerUnit.toString(),
    currency: r.currency,
    fxRateToBase: r.fxRateToBase.toString(),
    effectiveAt: r.effectiveAt,
    createdByUserId: r.createdByUserId,
  };
}

export async function listMaterials(tenantId: string, opts?: { includeInactive?: boolean }): Promise<MaterialRow[]> {
  const rows = await prisma.material.findMany({
    where: {
      tenantId,
      ...(opts?.includeInactive ? {} : { active: true }),
    },
    orderBy: { name: 'asc' },
  });
  return rows.map(toMaterialRow);
}

export async function getMaterialById(tenantId: string, id: string): Promise<MaterialRow | null> {
  const row = await prisma.material.findFirst({ where: { id, tenantId } });
  return row ? toMaterialRow(row) : null;
}

export async function createMaterial(tenantId: string, input: CreateMaterialInput): Promise<MaterialRow> {
  const row = await prisma.material.create({
    data: {
      tenantId,
      name: input.name,
      unit: input.unit,
      kind: input.kind,
      commoditySymbol: input.commoditySymbol ?? null,
      notes: input.notes ?? null,
    },
  });
  return toMaterialRow(row);
}

export async function updateMaterial(
  tenantId: string,
  id: string,
  patch: UpdateMaterialInput,
): Promise<MaterialRow | null> {
  const result = await prisma.material.updateMany({
    where: { id, tenantId },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
      ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
      ...(patch.commoditySymbol !== undefined ? { commoditySymbol: patch.commoditySymbol } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    },
  });
  if (result.count === 0) return null;
  return getMaterialById(tenantId, id);
}

export async function deactivateMaterial(tenantId: string, id: string): Promise<boolean> {
  const r = await prisma.material.updateMany({
    where: { id, tenantId },
    data: { active: false },
  });
  return r.count > 0;
}

export interface PriceListOptions {
  source?: MaterialPriceSource;
  from?: Date;
  to?: Date;
  limit?: number;
}

export async function listPrices(
  tenantId: string,
  materialId: string,
  opts: PriceListOptions = {},
): Promise<MaterialPriceRow[]> {
  const rows = await prisma.materialPrice.findMany({
    where: {
      tenantId,
      materialId,
      ...(opts.source ? { source: opts.source } : {}),
      effectiveAt: {
        ...(opts.from ? { gte: opts.from } : {}),
        ...(opts.to ? { lte: opts.to } : {}),
      },
    },
    orderBy: { effectiveAt: 'desc' },
    take: opts.limit ?? 100,
  });
  return rows.map(toPriceRow);
}

export async function recordManualPrice(
  tenantId: string,
  materialId: string,
  input: CreateManualPriceInput,
  userId: string,
): Promise<MaterialPriceRow> {
  const row = await prisma.materialPrice.create({
    data: {
      tenantId,
      materialId,
      source: MaterialPriceSource.manual,
      supplierId: null,
      pricePerUnit: input.pricePerUnit,
      currency: input.currency,
      fxRateToBase: input.fxRateToBase,
      effectiveAt: input.effectiveAt,
      createdByUserId: userId,
    },
  });
  return toPriceRow(row);
}

export async function recordSupplierPrice(
  tenantId: string,
  materialId: string,
  input: { supplierId: string; pricePerUnit: string; currency: string; fxRateToBase: string; effectiveAt: Date },
  userId: string,
): Promise<MaterialPriceRow> {
  const row = await prisma.materialPrice.create({
    data: {
      tenantId,
      materialId,
      source: MaterialPriceSource.supplier,
      supplierId: input.supplierId,
      pricePerUnit: input.pricePerUnit,
      currency: input.currency,
      fxRateToBase: input.fxRateToBase,
      effectiveAt: input.effectiveAt,
      createdByUserId: userId,
    },
  });
  return toPriceRow(row);
}

export async function recordFeedPrice(
  tenantId: string,
  materialId: string,
  input: { pricePerUnit: string; currency: string; fxRateToBase: string; effectiveAt: Date },
): Promise<MaterialPriceRow> {
  const row = await prisma.materialPrice.create({
    data: {
      tenantId,
      materialId,
      source: MaterialPriceSource.feed,
      supplierId: null,
      pricePerUnit: input.pricePerUnit,
      currency: input.currency,
      fxRateToBase: input.fxRateToBase,
      effectiveAt: input.effectiveAt,
      createdByUserId: null,
    },
  });
  return toPriceRow(row);
}

export interface CurrentPriceRow {
  materialId: string;
  source: MaterialPriceSource;
  supplierId: string | null;
  pricePerUnit: string;
  currency: string;
  fxRateToBase: string;
  effectiveAt: Date;
}

/**
 * Latest price per `(materialId, source, supplierId)` at-or-before `now`,
 * scoped to the tenant. The "current prices" view referenced by spec §4.2
 * and used by the cost-breakdown calculator (Phase 6).
 */
export async function getCurrentPrices(
  tenantId: string,
  materialId?: string,
): Promise<CurrentPriceRow[]> {
  const rows = await prisma.$queryRawUnsafe<
    {
      material_id: string;
      source: MaterialPriceSource;
      supplier_id: string | null;
      price_per_unit: { toString: () => string };
      currency: string;
      fx_rate_to_base: { toString: () => string };
      effective_at: Date;
    }[]
  >(
    `SELECT DISTINCT ON ("materialId", source, "supplierId")
       "materialId" AS material_id,
       source,
       "supplierId" AS supplier_id,
       "pricePerUnit" AS price_per_unit,
       currency,
       "fxRateToBase" AS fx_rate_to_base,
       "effectiveAt" AS effective_at
     FROM material_price
     WHERE "tenantId" = $1
       AND "effectiveAt" <= NOW()
       ${materialId ? `AND "materialId" = $2` : ''}
     ORDER BY "materialId", source, "supplierId", "effectiveAt" DESC`,
    tenantId,
    ...(materialId ? [materialId] : []),
  );
  return rows.map((r) => ({
    materialId: r.material_id,
    source: r.source,
    supplierId: r.supplier_id,
    pricePerUnit: r.price_per_unit.toString(),
    currency: r.currency,
    fxRateToBase: r.fx_rate_to_base.toString(),
    effectiveAt: r.effective_at,
  }));
}

export async function markFeedFetched(tenantId: string, materialId: string, when: Date): Promise<void> {
  await prisma.material.updateMany({
    where: { id: materialId, tenantId },
    data: { lastFeedFetchedAt: when },
  });
}
