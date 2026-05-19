import { errors } from '@/shared/api-errors';
import * as repo from './repo.js';
import type {
  CreateMaterialInput,
  CreateManualPriceInput,
  CreateSupplierPriceInput,
  PriceQuery,
  UpdateMaterialInput,
} from './schema.js';
import type { MaterialRow, MaterialPriceRow, CurrentPriceRow } from './repo.js';

export type { MaterialRow, MaterialPriceRow, CurrentPriceRow };

export async function list(tenantId: string, includeInactive = false): Promise<MaterialRow[]> {
  return repo.listMaterials(tenantId, { includeInactive });
}

export async function get(tenantId: string, id: string): Promise<MaterialRow> {
  const row = await repo.getMaterialById(tenantId, id);
  if (!row) throw errors.notFound(`material ${id} not found`);
  return row;
}

export async function create(tenantId: string, input: CreateMaterialInput): Promise<MaterialRow> {
  return repo.createMaterial(tenantId, input);
}

export async function update(
  tenantId: string,
  id: string,
  patch: UpdateMaterialInput,
): Promise<MaterialRow> {
  const updated = await repo.updateMaterial(tenantId, id, patch);
  if (!updated) throw errors.notFound(`material ${id} not found`);
  return updated;
}

export async function deactivate(tenantId: string, id: string): Promise<void> {
  const ok = await repo.deactivateMaterial(tenantId, id);
  if (!ok) throw errors.notFound(`material ${id} not found`);
}

export async function listPrices(
  tenantId: string,
  materialId: string,
  query: PriceQuery,
): Promise<MaterialPriceRow[]> {
  // Tenant-scope guard: confirm the material belongs to this tenant first.
  await get(tenantId, materialId);
  return repo.listPrices(tenantId, materialId, query);
}

export async function recordManualPrice(
  tenantId: string,
  materialId: string,
  userId: string,
  input: CreateManualPriceInput,
): Promise<MaterialPriceRow> {
  await get(tenantId, materialId);
  return repo.recordManualPrice(tenantId, materialId, input, userId);
}

export async function recordSupplierPrice(
  tenantId: string,
  materialId: string,
  userId: string,
  input: CreateSupplierPriceInput,
): Promise<MaterialPriceRow> {
  await get(tenantId, materialId);
  return repo.recordSupplierPrice(tenantId, materialId, input, userId);
}

export async function currentPrices(
  tenantId: string,
  materialId?: string,
): Promise<CurrentPriceRow[]> {
  return repo.getCurrentPrices(tenantId, materialId);
}
