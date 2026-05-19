import { prisma } from '@aura/db';
import { addMoney, mulMoney, toBase } from '@aura/domain';
import * as pieces from '@/modules/pieces/service';
import type {
  InventoryQuery,
  MarginQuery,
  RevenueQuery,
} from './schema.js';

/**
 * Reports service. All aggregations exclude refunded sales (refundedAt
 * is NULL) except `margin`, which preserves cost/sale history for
 * sold-and-returned pieces because margin is a historical record.
 *
 * Money is always returned converted to the tenant's base currency,
 * using the `fxRateToBase` snapshot stored on each sale row.
 */

export interface RevenueBucket {
  key: string;        // month "2026-05", channel/buyer/category name or id
  label: string;      // human-friendly version
  revenueBase: string;
  netBase: string;
  units: number;
}

export async function revenue(
  tenantId: string,
  query: RevenueQuery,
): Promise<RevenueBucket[]> {
  const sales = await prisma.sale.findMany({
    where: {
      tenantId,
      refundedAt: null,
      soldAt: {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      },
    },
    include: {
      channel: { select: { name: true } },
      buyer: { select: { name: true } },
      piece: { select: { category: true } },
    },
    orderBy: { soldAt: 'asc' },
  });

  const buckets = new Map<string, RevenueBucket>();

  for (const s of sales) {
    const priceBase = toBase(s.salePrice.toString(), s.fxRateToBase.toString());
    const netBase = toBase(s.netAmount.toString(), s.fxRateToBase.toString());
    let key: string;
    let label: string;
    switch (query.groupBy) {
      case 'month': {
        const d = new Date(s.soldAt);
        key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        label = key;
        break;
      }
      case 'channel': {
        key = s.channelId;
        label = s.channel.name;
        break;
      }
      case 'buyer': {
        key = s.buyerId;
        label = s.buyer.name;
        break;
      }
      case 'category': {
        key = s.piece.category ?? '(uncategorized)';
        label = key;
        break;
      }
    }
    const existing = buckets.get(key);
    if (existing) {
      existing.revenueBase = addMoney(existing.revenueBase, priceBase);
      existing.netBase = addMoney(existing.netBase, netBase);
      existing.units += 1;
    } else {
      buckets.set(key, { key, label, revenueBase: priceBase, netBase, units: 1 });
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export interface InventoryBucket {
  key: string;
  label: string;
  count: number;
}

export async function inventory(
  tenantId: string,
  query: InventoryQuery,
): Promise<InventoryBucket[]> {
  if (query.groupBy === 'status') {
    const grouped = await prisma.piece.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { _all: true },
    });
    return grouped
      .map((r) => ({ key: r.status, label: r.status, count: r._count._all }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }
  // category
  const grouped = await prisma.piece.groupBy({
    by: ['category'],
    where: { tenantId },
    _count: { _all: true },
  });
  return grouped
    .map((r) => ({
      key: r.category ?? '(uncategorized)',
      label: r.category ?? '(uncategorized)',
      count: r._count._all,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export interface MarginRow {
  pieceId: string;
  pieceTitle: string;
  category: string | null;
  soldAt: Date;
  refunded: boolean;
  salePriceBase: string;
  commissionAmountBase: string;
  netRevenueBase: string;
  materialsCostBase: string;
  laborCostBase: string;
  totalCostBase: string;
  marginBase: string;
  marginPct: string; // 2-dp
}

export async function margin(
  tenantId: string,
  query: MarginQuery,
): Promise<MarginRow[]> {
  // Pull all sales (including refunded) in the window so the margin report
  // shows historical record of what was sold and what was returned.
  const sales = await prisma.sale.findMany({
    where: {
      tenantId,
      soldAt: {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lte: query.to } : {}),
      },
    },
    include: {
      piece: { select: { id: true, title: true, category: true } },
    },
    orderBy: { soldAt: 'desc' },
  });

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { hourlyLaborRate: true },
  });
  const hourly = tenant.hourlyLaborRate.toString();

  const rows: MarginRow[] = [];
  for (const s of sales) {
    const salePriceBase = toBase(s.salePrice.toString(), s.fxRateToBase.toString());
    const commissionAmountBase = toBase(
      s.commissionAmount.toString(),
      s.fxRateToBase.toString(),
    );
    const netRevenueBase = toBase(
      s.netAmount.toString(),
      s.fxRateToBase.toString(),
    );

    const materialsCostBase = await pieces.materialsCostBase(tenantId, s.pieceId);
    const totalSec = await pieces.totalSessionSeconds(tenantId, s.pieceId);
    const hours = (totalSec / 3600).toString();
    const laborCostBase = mulMoney(hourly, hours);
    const totalCostBase = addMoney(materialsCostBase, laborCostBase);

    const marginBase = subtract(netRevenueBase, totalCostBase);
    const marginPct = percentOf(marginBase, netRevenueBase);

    rows.push({
      pieceId: s.pieceId,
      pieceTitle: s.piece.title,
      category: s.piece.category,
      soldAt: s.soldAt,
      refunded: !!s.refundedAt,
      salePriceBase,
      commissionAmountBase,
      netRevenueBase,
      materialsCostBase,
      laborCostBase,
      totalCostBase,
      marginBase,
      marginPct,
    });
  }
  return rows;
}

function subtract(a: string, b: string): string {
  // Use mulMoney(-1) on b and addMoney; (or import subMoney from @aura/domain
  // — but local helper keeps the import surface small for now).
  return addMoney(a, mulMoney(b, '-1'));
}

function percentOf(numerator: string, denominator: string): string {
  // Avoid division by zero — return '0' when denominator is zero.
  const denomNum = Number(denominator);
  if (!Number.isFinite(denomNum) || denomNum === 0) return '0';
  const ratio = Number(numerator) / denomNum;
  return (Math.round(ratio * 10_000) / 100).toFixed(2);
}
