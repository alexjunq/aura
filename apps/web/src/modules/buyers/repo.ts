import { prisma, BuyerInteractionKind } from '@aura/db';
import type { CreateBuyerInput, CreateInteractionInput, UpdateBuyerInput } from './schema.js';

export interface BuyerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  birthdate: Date | null;
  address: unknown;
  interests: string[];
  notes: string | null;
  retiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InteractionRow {
  id: string;
  buyerId: string;
  occurredAt: Date;
  kind: BuyerInteractionKind;
  summary: string;
  createdByUserId: string | null;
}

function toBuyer(r: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  birthdate: Date | null;
  address: unknown;
  interests: string[];
  notes: string | null;
  retiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): BuyerRow {
  return r;
}

export async function listBuyers(
  tenantId: string,
  opts: { q?: string; limit?: number; includeRetired?: boolean } = {},
): Promise<BuyerRow[]> {
  const rows = await prisma.buyer.findMany({
    where: {
      tenantId,
      ...(opts.includeRetired ? {} : { retiredAt: null }),
      ...(opts.q
        ? {
            OR: [
              { name: { contains: opts.q, mode: 'insensitive' } },
              { email: { contains: opts.q, mode: 'insensitive' } },
              { instagram: { contains: opts.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { name: 'asc' },
    take: opts.limit ?? 50,
  });
  return rows.map(toBuyer);
}

export async function getBuyerById(tenantId: string, id: string): Promise<BuyerRow | null> {
  const r = await prisma.buyer.findFirst({ where: { id, tenantId } });
  return r ? toBuyer(r) : null;
}

export async function createBuyer(
  tenantId: string,
  input: CreateBuyerInput,
): Promise<BuyerRow> {
  const row = await prisma.buyer.create({
    data: {
      tenantId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      instagram: input.instagram ?? null,
      birthdate: input.birthdate ?? null,
      address: (input.address ?? undefined) as never,
      interests: input.interests ?? [],
      notes: input.notes ?? null,
    },
  });
  return toBuyer(row);
}

export async function updateBuyer(
  tenantId: string,
  id: string,
  patch: UpdateBuyerInput,
): Promise<BuyerRow | null> {
  const r = await prisma.buyer.updateMany({
    where: { id, tenantId },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.instagram !== undefined ? { instagram: patch.instagram } : {}),
      ...(patch.birthdate !== undefined ? { birthdate: patch.birthdate } : {}),
      ...(patch.address !== undefined ? { address: patch.address as never } : {}),
      ...(patch.interests !== undefined ? { interests: patch.interests } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    },
  });
  if (r.count === 0) return null;
  return getBuyerById(tenantId, id);
}

export async function retireBuyer(tenantId: string, id: string): Promise<boolean> {
  const r = await prisma.buyer.updateMany({
    where: { id, tenantId, retiredAt: null },
    data: { retiredAt: new Date() },
  });
  return r.count > 0;
}

// --- Interactions ---

export async function listInteractions(
  tenantId: string,
  buyerId: string,
): Promise<InteractionRow[]> {
  const buyer = await prisma.buyer.findFirst({
    where: { id: buyerId, tenantId },
    select: { id: true },
  });
  if (!buyer) return [];
  const rows = await prisma.buyerInteraction.findMany({
    where: { tenantId, buyerId },
    orderBy: { occurredAt: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    buyerId: r.buyerId,
    occurredAt: r.occurredAt,
    kind: r.kind,
    summary: r.summary,
    createdByUserId: r.createdByUserId,
  }));
}

export async function createInteraction(
  tenantId: string,
  buyerId: string,
  userId: string,
  input: CreateInteractionInput,
): Promise<InteractionRow | null> {
  const buyer = await prisma.buyer.findFirst({
    where: { id: buyerId, tenantId },
    select: { id: true },
  });
  if (!buyer) return null;
  const row = await prisma.buyerInteraction.create({
    data: {
      tenantId,
      buyerId,
      occurredAt: input.occurredAt,
      kind: input.kind,
      summary: input.summary,
      createdByUserId: userId,
    },
  });
  return {
    id: row.id,
    buyerId: row.buyerId,
    occurredAt: row.occurredAt,
    kind: row.kind,
    summary: row.summary,
    createdByUserId: row.createdByUserId,
  };
}

export async function deleteInteraction(
  tenantId: string,
  buyerId: string,
  interactionId: string,
): Promise<boolean> {
  const r = await prisma.buyerInteraction.deleteMany({
    where: { id: interactionId, buyerId, tenantId },
  });
  return r.count > 0;
}
