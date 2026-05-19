import * as repo from './repo.js';
import type { TenantSettingsRow } from './repo.js';
import type { UpdateSettingsInput } from './schema.js';

export async function getSettings(tenantId: string): Promise<TenantSettingsRow> {
  const row = await repo.getSettings(tenantId);
  if (!row) {
    throw new Error(`tenant ${tenantId} not found`);
  }
  return row;
}

export async function updateSettings(
  tenantId: string,
  patch: UpdateSettingsInput,
): Promise<TenantSettingsRow> {
  return repo.updateSettings(tenantId, patch);
}
