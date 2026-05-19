import { prisma } from '@aura/db';
import type { UpdateSettingsInput } from './schema.js';

/**
 * Settings repo — the canonical example of the tenant-scoped repo pattern.
 *
 * Every function takes `tenantId` first, even when there's exactly one
 * row to operate on. The tenant id is never read from a global. This is
 * what every subsequent module follows.
 */

export interface TenantSettingsRow {
  id: string;
  studioName: string;
  baseCurrency: string;
  hourlyLaborRate: string; // serialized decimal
}

export async function getSettings(tenantId: string): Promise<TenantSettingsRow | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      baseCurrency: true,
      hourlyLaborRate: true,
    },
  });
  if (!tenant) return null;
  return {
    id: tenant.id,
    studioName: tenant.name,
    baseCurrency: tenant.baseCurrency,
    hourlyLaborRate: tenant.hourlyLaborRate.toString(),
  };
}

export async function updateSettings(
  tenantId: string,
  patch: UpdateSettingsInput,
): Promise<TenantSettingsRow> {
  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(patch.studioName !== undefined ? { name: patch.studioName } : {}),
      ...(patch.baseCurrency !== undefined ? { baseCurrency: patch.baseCurrency } : {}),
      ...(patch.hourlyLaborRate !== undefined
        ? { hourlyLaborRate: patch.hourlyLaborRate }
        : {}),
    },
    select: {
      id: true,
      name: true,
      baseCurrency: true,
      hourlyLaborRate: true,
    },
  });
  return {
    id: updated.id,
    studioName: updated.name,
    baseCurrency: updated.baseCurrency,
    hourlyLaborRate: updated.hourlyLaborRate.toString(),
  };
}
