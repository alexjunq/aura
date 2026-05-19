import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { disconnect, resetDb } from '@/__tests__/helpers/db';
import { seedTenant } from '@/__tests__/helpers/seed';
import * as sales from '../../service.js';
import * as pieces from '@/modules/pieces/service';
import * as buyers from '@/modules/buyers/service';
import * as channels from '@/modules/channels/service';
import * as materials from '@/modules/materials/service';
import * as pricing from '@/modules/pricing/service';

interface Fixture {
  tenantId: string;
  userId: string;
  pieceId: string;
  buyerId: string;
  channelId: string;
}

async function setupSellablePiece(label: string, opts?: { commissionPct?: string }): Promise<Fixture> {
  const { tenantId, userId } = await seedTenant(label);
  const channel = await channels.create(tenantId, {
    name: 'Gallery',
    type: 'physical_store',
    commissionPct: opts?.commissionPct ?? '10',
  });
  const buyer = await buyers.create(tenantId, { name: 'Buyer', interests: [] });
  const piece = await pieces.create(tenantId, { title: 'Ring' });
  await pieces.transitionStatus(tenantId, userId, piece.id, { to: 'in_studio' });
  return {
    tenantId,
    userId,
    pieceId: piece.id,
    buyerId: buyer.id,
    channelId: channel.id,
  };
}

describe('sales — recordSale (Flow A)', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('atomically writes sale + flips piece to sold + appends history with saleId context', async () => {
    const f = await setupSellablePiece('rs1');
    const sale = await sales.recordSale(f.tenantId, f.userId, {
      pieceId: f.pieceId,
      buyerId: f.buyerId,
      channelId: f.channelId,
      salePrice: '500',
      currency: 'USD',
      fxRateToBase: '1',
      soldAt: new Date('2026-05-15T12:00:00Z'),
    });
    expect(sale.commissionPctSnapshot).toBe('10');
    // Prisma's Decimal toString trims trailing zeros.
    expect(sale.commissionAmount).toBe('50');
    expect(sale.netAmount).toBe('450');

    const piece = await pieces.get(f.tenantId, f.pieceId);
    expect(piece.status).toBe('sold');

    const history = await pieces.statusHistory(f.tenantId, f.pieceId);
    const last = history[0];
    expect(last?.toStatus).toBe('sold');
    expect(last?.context).toMatchObject({ saleId: sale.id, channelId: f.channelId });
  });

  it('snapshots commission so later channel edits do not rewrite history', async () => {
    const f = await setupSellablePiece('rs2');
    const sale = await sales.recordSale(f.tenantId, f.userId, {
      pieceId: f.pieceId,
      buyerId: f.buyerId,
      channelId: f.channelId,
      salePrice: '100',
      currency: 'USD',
      fxRateToBase: '1',
      soldAt: new Date(),
    });
    expect(sale.commissionPctSnapshot).toBe('10');
    // Update channel commission upward.
    await channels.update(f.tenantId, f.channelId, { commissionPct: '25' });
    const reloaded = await sales.get(f.tenantId, sale.id);
    expect(reloaded.commissionPctSnapshot).toBe('10'); // unchanged
  });

  it('rejects recording a sale against a non-sellable piece', async () => {
    const { tenantId, userId } = await seedTenant('rs3');
    const channel = await channels.create(tenantId, {
      name: 'C', type: 'direct', commissionPct: '0',
    });
    const buyer = await buyers.create(tenantId, { name: 'B', interests: [] });
    const piece = await pieces.create(tenantId, { title: 'In-progress piece' });
    // piece is still in_progress; not sellable.
    await expect(
      sales.recordSale(tenantId, userId, {
        pieceId: piece.id,
        buyerId: buyer.id,
        channelId: channel.id,
        salePrice: '10',
        currency: 'USD',
        fxRateToBase: '1',
        soldAt: new Date(),
      }),
    ).rejects.toMatchObject({ code: 'illegal_transition' });
    // Piece status unchanged.
    expect((await pieces.get(tenantId, piece.id)).status).toBe('in_progress');
  });

  it('partial unique index forbids a second active sale for the same piece', async () => {
    const f = await setupSellablePiece('rs4');
    await sales.recordSale(f.tenantId, f.userId, {
      pieceId: f.pieceId,
      buyerId: f.buyerId,
      channelId: f.channelId,
      salePrice: '100',
      currency: 'USD',
      fxRateToBase: '1',
      soldAt: new Date(),
    });
    // Second attempt should be blocked — piece is now `sold`, recordSale will
    // refuse before even hitting the DB constraint.
    await expect(
      sales.recordSale(f.tenantId, f.userId, {
        pieceId: f.pieceId,
        buyerId: f.buyerId,
        channelId: f.channelId,
        salePrice: '100',
        currency: 'USD',
        fxRateToBase: '1',
        soldAt: new Date(),
      }),
    ).rejects.toMatchObject({ code: 'illegal_transition' });
  });
});

describe('sales — refund (Flow B)', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('flips piece to returned, marks sale refunded, allows re-selling after returning to in_studio', async () => {
    const f = await setupSellablePiece('ref1');
    const sale = await sales.recordSale(f.tenantId, f.userId, {
      pieceId: f.pieceId,
      buyerId: f.buyerId,
      channelId: f.channelId,
      salePrice: '500',
      currency: 'USD',
      fxRateToBase: '1',
      soldAt: new Date(),
    });
    const refunded = await sales.refund(f.tenantId, f.userId, sale.id);
    expect(refunded.refundedAt).toBeTruthy();
    expect((await pieces.get(f.tenantId, f.pieceId)).status).toBe('returned');

    // Take it back to in_studio (legal) and resell — partial unique index lets
    // the second sale through because the first is refunded.
    await pieces.transitionStatus(f.tenantId, f.userId, f.pieceId, { to: 'in_studio' });
    const sale2 = await sales.recordSale(f.tenantId, f.userId, {
      pieceId: f.pieceId,
      buyerId: f.buyerId,
      channelId: f.channelId,
      salePrice: '600',
      currency: 'USD',
      fxRateToBase: '1',
      soldAt: new Date(),
    });
    expect(sale2.id).not.toBe(sale.id);

    // Both rows still present, only the latest is non-refunded.
    const all = await sales.list(f.tenantId, { pieceId: f.pieceId, limit: 10 });
    expect(all).toHaveLength(2);
    const active = all.filter((s) => !s.refundedAt);
    expect(active).toHaveLength(1);
    expect(active[0]?.id).toBe(sale2.id);
  });

  it('refund is idempotent', async () => {
    const f = await setupSellablePiece('ref2');
    const sale = await sales.recordSale(f.tenantId, f.userId, {
      pieceId: f.pieceId,
      buyerId: f.buyerId,
      channelId: f.channelId,
      salePrice: '100',
      currency: 'USD',
      fxRateToBase: '1',
      soldAt: new Date(),
    });
    await sales.refund(f.tenantId, f.userId, sale.id);
    const second = await sales.refund(f.tenantId, f.userId, sale.id);
    expect(second.refundedAt).toBeTruthy();
  });
});

describe('pricing — breakdown (Flow D)', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('sums material lines + labor at tenant hourly rate', async () => {
    const { tenantId, userId } = await seedTenant('cb1');
    // Set tenant hourly rate to 50.
    await import('@/modules/settings/service').then((s) =>
      s.updateSettings(tenantId, { hourlyLaborRate: '50' }),
    );

    const m = await materials.create(tenantId, {
      name: 'Gold', unit: 'g', kind: 'commodity', commoditySymbol: 'XAU',
    });
    await materials.recordManualPrice(tenantId, m.id, userId, {
      pricePerUnit: '60', currency: 'USD', fxRateToBase: '1', effectiveAt: new Date(),
    });
    const piece = await pieces.create(tenantId, { title: 'Ring' });
    await pieces.addMaterial(tenantId, userId, piece.id, { materialId: m.id, quantity: '2' });
    // Add a manual session: 1 hour.
    await pieces.recordSession(tenantId, piece.id, {
      startedAt: new Date('2026-01-01T10:00:00Z'),
      endedAt: new Date('2026-01-01T11:00:00Z'),
      note: null,
    });

    const bd = await pricing.breakdown(tenantId, piece.id);
    // Material: 60 * 2 = 120
    expect(bd.materials.totalBase).toBe('120.0000');
    // Labor: 1h * 50 = 50
    expect(bd.labor.totalBase).toBe('50.0000');
    // Total: 170
    expect(bd.totalCostBase).toBe('170.0000');
    expect(bd.lastSalePriceBase).toBeNull();
  });

  it('reflects drift via atCurrentPrices when prices move after material was added', async () => {
    const { tenantId, userId } = await seedTenant('cb2');
    const m = await materials.create(tenantId, {
      name: 'Silver', unit: 'g', kind: 'commodity', commoditySymbol: 'XAG',
    });
    await materials.recordManualPrice(tenantId, m.id, userId, {
      pricePerUnit: '1', currency: 'USD', fxRateToBase: '1',
      effectiveAt: new Date('2026-01-01T00:00:00Z'),
    });
    const piece = await pieces.create(tenantId, { title: 'Ring' });
    await pieces.addMaterial(tenantId, userId, piece.id, { materialId: m.id, quantity: '10' });

    // Price doubles after the material was added.
    await materials.recordManualPrice(tenantId, m.id, userId, {
      pricePerUnit: '2', currency: 'USD', fxRateToBase: '1',
      effectiveAt: new Date('2026-02-01T00:00:00Z'),
    });

    const bd = await pricing.breakdown(tenantId, piece.id);
    expect(bd.materials.totalBase).toBe('10.0000'); // snapshot
    expect(bd.atCurrentPrices.materialsTotalBase).toBe('20.0000'); // current
  });

  it('reports lastSalePriceBase when there is a non-refunded sale', async () => {
    const f = await setupSellablePiece('cb3', { commissionPct: '0' });
    await sales.recordSale(f.tenantId, f.userId, {
      pieceId: f.pieceId,
      buyerId: f.buyerId,
      channelId: f.channelId,
      salePrice: '400',
      currency: 'USD',
      fxRateToBase: '1',
      soldAt: new Date(),
    });
    const bd = await pricing.breakdown(f.tenantId, f.pieceId);
    expect(bd.lastSalePriceBase).toBe('400.0000');
  });
});

describe('sales — tenant isolation', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('refuses cross-tenant sale recording and refunds', async () => {
    const a = await setupSellablePiece('iso-sa');
    const b = await seedTenant('iso-sb');

    // Tenant B cannot record a sale referencing tenant A's piece/buyer/channel.
    await expect(
      sales.recordSale(b.tenantId, b.userId, {
        pieceId: a.pieceId,
        buyerId: a.buyerId,
        channelId: a.channelId,
        salePrice: '100',
        currency: 'USD',
        fxRateToBase: '1',
        soldAt: new Date(),
      }),
    ).rejects.toMatchObject({ code: 'not_found' });

    // Set up a sale on tenant A, then try to refund from tenant B.
    const sale = await sales.recordSale(a.tenantId, a.userId, {
      pieceId: a.pieceId,
      buyerId: a.buyerId,
      channelId: a.channelId,
      salePrice: '100',
      currency: 'USD',
      fxRateToBase: '1',
      soldAt: new Date(),
    });
    await expect(sales.refund(b.tenantId, b.userId, sale.id)).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});
