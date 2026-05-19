import { errors } from '@/shared/api-errors';
import * as repo from './repo.js';
import type {
  CreateSupplierInput,
  LinkMaterialInput,
  UpdateSupplierInput,
} from './schema.js';
import type { SupplierRow, SupplierMaterialRow } from './repo.js';

export type { SupplierRow, SupplierMaterialRow };

export async function list(tenantId: string, includeInactive = false): Promise<SupplierRow[]> {
  return repo.listSuppliers(tenantId, { includeInactive });
}

export async function get(tenantId: string, id: string): Promise<SupplierRow> {
  const row = await repo.getSupplierById(tenantId, id);
  if (!row) throw errors.notFound(`supplier ${id} not found`);
  return row;
}

export async function create(
  tenantId: string,
  input: CreateSupplierInput,
): Promise<SupplierRow> {
  return repo.createSupplier(tenantId, input);
}

export async function update(
  tenantId: string,
  id: string,
  patch: UpdateSupplierInput,
): Promise<SupplierRow> {
  const updated = await repo.updateSupplier(tenantId, id, patch);
  if (!updated) throw errors.notFound(`supplier ${id} not found`);
  return updated;
}

export async function deactivate(tenantId: string, id: string): Promise<void> {
  const ok = await repo.deactivateSupplier(tenantId, id);
  if (!ok) throw errors.notFound(`supplier ${id} not found`);
}

export async function listMaterials(
  tenantId: string,
  supplierId: string,
): Promise<SupplierMaterialRow[]> {
  await get(tenantId, supplierId); // tenant guard
  return repo.listSupplierMaterials(tenantId, supplierId);
}

export async function linkMaterial(
  tenantId: string,
  supplierId: string,
  input: LinkMaterialInput,
): Promise<SupplierMaterialRow> {
  const row = await repo.linkMaterial(tenantId, supplierId, input);
  if (!row) throw errors.notFound('supplier or material not found in tenant');
  return row;
}

export async function unlinkMaterial(
  tenantId: string,
  supplierId: string,
  materialId: string,
): Promise<void> {
  const ok = await repo.unlinkMaterial(tenantId, supplierId, materialId);
  if (!ok) throw errors.notFound('supplier-material link not found');
}
