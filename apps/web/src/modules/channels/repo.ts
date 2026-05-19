import { prisma, SalesChannelType } from '@aura/db';
import type { CreateChannelInput, UpdateChannelInput } from './schema.js';

export interface ChannelRow {
  id: string;
  name: string;
  type: SalesChannelType;
  commissionPct: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: unknown;
  notes: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toRow(r: {
  id: string;
  name: string;
  type: SalesChannelType;
  commissionPct: { toString: () => string };
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: unknown;
  notes: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ChannelRow {
  return { ...r, commissionPct: r.commissionPct.toString() };
}

export async function listChannels(
  tenantId: string,
  opts?: { includeInactive?: boolean },
): Promise<ChannelRow[]> {
  const rows = await prisma.salesChannel.findMany({
    where: {
      tenantId,
      ...(opts?.includeInactive ? {} : { active: true }),
    },
    orderBy: { name: 'asc' },
  });
  return rows.map(toRow);
}

export async function getChannelById(tenantId: string, id: string): Promise<ChannelRow | null> {
  const row = await prisma.salesChannel.findFirst({ where: { id, tenantId } });
  return row ? toRow(row) : null;
}

export async function createChannel(
  tenantId: string,
  input: CreateChannelInput,
): Promise<ChannelRow> {
  const row = await prisma.salesChannel.create({
    data: {
      tenantId,
      name: input.name,
      type: input.type,
      commissionPct: input.commissionPct,
      contactName: input.contactName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: (input.address ?? undefined) as never,
      notes: input.notes ?? null,
    },
  });
  return toRow(row);
}

export async function updateChannel(
  tenantId: string,
  id: string,
  patch: UpdateChannelInput,
): Promise<ChannelRow | null> {
  const r = await prisma.salesChannel.updateMany({
    where: { id, tenantId },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.commissionPct !== undefined ? { commissionPct: patch.commissionPct } : {}),
      ...(patch.contactName !== undefined ? { contactName: patch.contactName } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.address !== undefined ? { address: patch.address as never } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    },
  });
  if (r.count === 0) return null;
  return getChannelById(tenantId, id);
}

export async function deactivateChannel(tenantId: string, id: string): Promise<boolean> {
  const r = await prisma.salesChannel.updateMany({
    where: { id, tenantId },
    data: { active: false },
  });
  return r.count > 0;
}
