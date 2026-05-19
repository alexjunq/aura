import { errors } from '@/shared/api-errors';
import * as repo from './repo.js';
import type {
  CreateBuyerInput,
  CreateInteractionInput,
  UpdateBuyerInput,
} from './schema.js';
import type { BuyerRow, InteractionRow } from './repo.js';

export type { BuyerRow, InteractionRow };

export async function list(
  tenantId: string,
  opts: { q?: string; limit?: number; includeRetired?: boolean } = {},
): Promise<BuyerRow[]> {
  return repo.listBuyers(tenantId, opts);
}

export async function get(tenantId: string, id: string): Promise<BuyerRow> {
  const row = await repo.getBuyerById(tenantId, id);
  if (!row) throw errors.notFound(`buyer ${id} not found`);
  return row;
}

export async function create(
  tenantId: string,
  input: CreateBuyerInput,
): Promise<BuyerRow> {
  return repo.createBuyer(tenantId, input);
}

export async function update(
  tenantId: string,
  id: string,
  patch: UpdateBuyerInput,
): Promise<BuyerRow> {
  const r = await repo.updateBuyer(tenantId, id, patch);
  if (!r) throw errors.notFound(`buyer ${id} not found`);
  return r;
}

export async function retire(tenantId: string, id: string): Promise<void> {
  const ok = await repo.retireBuyer(tenantId, id);
  if (!ok) throw errors.notFound(`buyer ${id} not found or already retired`);
}

export async function listInteractions(
  tenantId: string,
  buyerId: string,
): Promise<InteractionRow[]> {
  await get(tenantId, buyerId);
  return repo.listInteractions(tenantId, buyerId);
}

export async function createInteraction(
  tenantId: string,
  buyerId: string,
  userId: string,
  input: CreateInteractionInput,
): Promise<InteractionRow> {
  const row = await repo.createInteraction(tenantId, buyerId, userId, input);
  if (!row) throw errors.notFound(`buyer ${buyerId} not found`);
  return row;
}

export async function deleteInteraction(
  tenantId: string,
  buyerId: string,
  interactionId: string,
): Promise<void> {
  await get(tenantId, buyerId);
  const ok = await repo.deleteInteraction(tenantId, buyerId, interactionId);
  if (!ok) throw errors.notFound(`interaction ${interactionId} not found`);
}
