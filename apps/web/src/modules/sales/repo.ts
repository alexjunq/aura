import { prisma } from '@aura/db';
import type { ListSalesQuery } from './schema.js';

export interface SaleRow {
  id: string;
  pieceId: string;
  buyerId: string;
  channelId: string;
  salePrice: string;
  currency: string;
  fxRateToBase: string;
  commissionPctSnapshot: string;
  commissionAmount: string;
  netAmount: string;
  soldAt: Date;
  refundedAt: Date | null;
  notes: string | null;
}

function toRow(r: {
  id: string;
  pieceId: string;
  buyerId: string;
  channelId: string;
  salePrice: { toString: () => string };
  currency: string;
  fxRateToBase: { toString: () => string };
  commissionPctSnapshot: { toString: () => string };
  commissionAmount: { toString: () => string };
  netAmount: { toString: () => string };
  soldAt: Date;
  refundedAt: Date | null;
  notes: string | null;
}): SaleRow {
  return {
    id: r.id,
    pieceId: r.pieceId,
    buyerId: r.buyerId,
    channelId: r.channelId,
    salePrice: r.salePrice.toString(),
    currency: r.currency,
    fxRateToBase: r.fxRateToBase.toString(),
    commissionPctSnapshot: r.commissionPctSnapshot.toString(),
    commissionAmount: r.commissionAmount.toString(),
    netAmount: r.netAmount.toString(),
    soldAt: r.soldAt,
    refundedAt: r.refundedAt,
    notes: r.notes,
  };
}

export async function listSales(tenantId: string, q: ListSalesQuery): Promise<SaleRow[]> {
  const rows = await prisma.sale.findMany({
    where: {
      tenantId,
      ...(q.channelId ? { channelId: q.channelId } : {}),
      ...(q.buyerId ? { buyerId: q.buyerId } : {}),
      ...(q.pieceId ? { pieceId: q.pieceId } : {}),
      soldAt: {
        ...(q.from ? { gte: q.from } : {}),
        ...(q.to ? { lte: q.to } : {}),
      },
    },
    orderBy: { soldAt: 'desc' },
    take: q.limit,
  });
  return rows.map(toRow);
}

export async function getSaleById(tenantId: string, id: string): Promise<SaleRow | null> {
  const r = await prisma.sale.findFirst({ where: { id, tenantId } });
  return r ? toRow(r) : null;
}

export async function listSalesForBuyer(
  tenantId: string,
  buyerId: string,
): Promise<SaleRow[]> {
  return listSales(tenantId, { buyerId, limit: 500 });
}

export type { SaleRow as Row };
