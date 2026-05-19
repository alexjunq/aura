import { errors } from '@/shared/api-errors';
import * as repo from './repo.js';
import type { CreateChannelInput, UpdateChannelInput } from './schema.js';
import type { ChannelRow } from './repo.js';

export type { ChannelRow };

export async function list(tenantId: string, includeInactive = false): Promise<ChannelRow[]> {
  return repo.listChannels(tenantId, { includeInactive });
}

export async function get(tenantId: string, id: string): Promise<ChannelRow> {
  const row = await repo.getChannelById(tenantId, id);
  if (!row) throw errors.notFound(`channel ${id} not found`);
  return row;
}

export async function create(
  tenantId: string,
  input: CreateChannelInput,
): Promise<ChannelRow> {
  return repo.createChannel(tenantId, input);
}

export async function update(
  tenantId: string,
  id: string,
  patch: UpdateChannelInput,
): Promise<ChannelRow> {
  const r = await repo.updateChannel(tenantId, id, patch);
  if (!r) throw errors.notFound(`channel ${id} not found`);
  return r;
}

export async function deactivate(tenantId: string, id: string): Promise<void> {
  const ok = await repo.deactivateChannel(tenantId, id);
  if (!ok) throw errors.notFound(`channel ${id} not found`);
}
