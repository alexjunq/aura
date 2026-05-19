import { prisma } from '@aura/db';
import type { CreateSupplierInput, LinkMaterialInput, UpdateSupplierInput } from './schema.js';

export interface SupplierRow {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: unknown;
  notes: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierMaterialRow {
  supplierId: string;
  materialId: string;
  sku: string | null;
  defaultLeadTimeDays: number | null;
  createdAt: Date;
}

function toRow(r: {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: unknown;
  notes: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SupplierRow {
  return r;
}

export async function listSuppliers(
  tenantId: string,
  opts?: { includeInactive?: boolean },
): Promise<SupplierRow[]> {
  const rows = await prisma.supplier.findMany({
    where: {
      tenantId,
      ...(opts?.includeInactive ? {} : { active: true }),
    },
    orderBy: { name: 'asc' },
  });
  return rows.map(toRow);
}

export async function getSupplierById(tenantId: string, id: string): Promise<SupplierRow | null> {
  const row = await prisma.supplier.findFirst({ where: { id, tenantId } });
  return row ? toRow(row) : null;
}

export async function createSupplier(
  tenantId: string,
  input: CreateSupplierInput,
): Promise<SupplierRow> {
  const row = await prisma.supplier.create({
    data: {
      tenantId,
      name: input.name,
      contactName: input.contactName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      website: input.website ?? null,
      address: (input.address ?? undefined) as never,
      notes: input.notes ?? null,
    },
  });
  return toRow(row);
}

export async function updateSupplier(
  tenantId: string,
  id: string,
  patch: UpdateSupplierInput,
): Promise<SupplierRow | null> {
  const r = await prisma.supplier.updateMany({
    where: { id, tenantId },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.contactName !== undefined ? { contactName: patch.contactName } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.website !== undefined ? { website: patch.website } : {}),
      ...(patch.address !== undefined ? { address: patch.address as never } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    },
  });
  if (r.count === 0) return null;
  return getSupplierById(tenantId, id);
}

export async function deactivateSupplier(tenantId: string, id: string): Promise<boolean> {
  const r = await prisma.supplier.updateMany({
    where: { id, tenantId },
    data: { active: false },
  });
  return r.count > 0;
}

export async function listSupplierMaterials(
  tenantId: string,
  supplierId: string,
): Promise<SupplierMaterialRow[]> {
  // Join through supplier to enforce tenant scoping.
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, tenantId },
    select: {
      supplierMaterials: {
        include: { material: { select: { tenantId: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!supplier) return [];
  return supplier.supplierMaterials.map((sm) => ({
    supplierId: sm.supplierId,
    materialId: sm.materialId,
    sku: sm.sku,
    defaultLeadTimeDays: sm.defaultLeadTimeDays,
    createdAt: sm.createdAt,
  }));
}

export async function linkMaterial(
  tenantId: string,
  supplierId: string,
  input: LinkMaterialInput,
): Promise<SupplierMaterialRow | null> {
  // Tenant guard: ensure both supplier and material belong to the tenant.
  const [supplier, material] = await Promise.all([
    prisma.supplier.findFirst({ where: { id: supplierId, tenantId }, select: { id: true } }),
    prisma.material.findFirst({ where: { id: input.materialId, tenantId }, select: { id: true } }),
  ]);
  if (!supplier || !material) return null;

  const row = await prisma.supplierMaterial.upsert({
    where: { supplierId_materialId: { supplierId, materialId: input.materialId } },
    update: {
      sku: input.sku ?? null,
      defaultLeadTimeDays: input.defaultLeadTimeDays ?? null,
    },
    create: {
      supplierId,
      materialId: input.materialId,
      sku: input.sku ?? null,
      defaultLeadTimeDays: input.defaultLeadTimeDays ?? null,
    },
  });
  return {
    supplierId: row.supplierId,
    materialId: row.materialId,
    sku: row.sku,
    defaultLeadTimeDays: row.defaultLeadTimeDays,
    createdAt: row.createdAt,
  };
}

export async function unlinkMaterial(
  tenantId: string,
  supplierId: string,
  materialId: string,
): Promise<boolean> {
  // Tenant guard via join.
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, tenantId },
    select: { id: true },
  });
  if (!supplier) return false;
  const result = await prisma.supplierMaterial.deleteMany({
    where: { supplierId, materialId },
  });
  return result.count > 0;
}
