import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import Papa from 'papaparse';
import { disconnect, resetDb } from '@/__tests__/helpers/db';
import { seedTenant } from '@/__tests__/helpers/seed';
import * as reports from '../../service.js';
import * as channels from '@/modules/channels/service';
import * as buyers from '@/modules/buyers/service';
import * as pieces from '@/modules/pieces/service';
import * as sales from '@/modules/sales/service';
import * as settings from '@/modules/settings/service';

interface Fixture {
  tenantId: string;
  userId: string;
  channelId: string;
  altChannelId: string;
  buyer1Id: string;
  buyer2Id: string;
}

async function setupFixture(label: string): Promise<Fixture> {
  const t = await seedTenant(label);
  await settings.updateSettings(t.tenantId, { hourlyLaborRate: '30' });
  const c1 = await channels.create(t.tenantId, { name: 'Etsy', type: 'online', commissionPct: '5' });
  const c2 = await channels.create(t.tenantId, { name: 'Gallery', type: 'physical_store', commissionPct: '20' });
  const b1 = await buyers.create(t.tenantId, { name: 'Alice', interests: [] });
  const b2 = await buyers.create(t.tenantId, { name: 'Bob', interests: [] });
  return {
    tenantId: t.tenantId,
    userId: t.userId,
    channelId: c1.id,
    altChannelId: c2.id,
    buyer1Id: b1.id,
    buyer2Id: b2.id,
  };
}

async function makeSale(f: Fixture, title: string, channelId: string, buyerId: string, price: string, soldAt: Date) {
  const p = await pieces.create(f.tenantId, { title });
  await pieces.transitionStatus(f.tenantId, f.userId, p.id, { to: 'in_studio' });
  const s = await sales.recordSale(f.tenantId, f.userId, {
    pieceId: p.id,
    buyerId,
    channelId,
    salePrice: price,
    currency: 'USD',
    fxRateToBase: '1',
    soldAt,
  });
  return { piece: p, sale: s };
}

describe('reports — revenue', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('groups by channel and excludes refunded sales', async () => {
    const f = await setupFixture('rev1');
    await makeSale(f, 'P1', f.channelId, f.buyer1Id, '100', new Date('2026-03-01T12:00:00Z'));
    await makeSale(f, 'P2', f.channelId, f.buyer2Id, '200', new Date('2026-03-02T12:00:00Z'));
    const { sale: refundedSale } = await makeSale(f, 'P3', f.altChannelId, f.buyer1Id, '500', new Date('2026-03-03T12:00:00Z'));
    await sales.refund(f.tenantId, f.userId, refundedSale.id);

    const byChannel = await reports.revenue(f.tenantId, { groupBy: 'channel' });
    // Refunded P3 is excluded; only the Etsy bucket has revenue.
    expect(byChannel).toHaveLength(1);
    expect(byChannel[0]?.label).toBe('Etsy');
    expect(byChannel[0]?.units).toBe(2);
    expect(byChannel[0]?.revenueBase).toBe('300.0000');
    // Net is 100*0.95 + 200*0.95 = 285.
    expect(byChannel[0]?.netBase).toBe('285.0000');
  });

  it('groups by month using UTC dates', async () => {
    const f = await setupFixture('rev2');
    await makeSale(f, 'A', f.channelId, f.buyer1Id, '100', new Date('2026-03-15T12:00:00Z'));
    await makeSale(f, 'B', f.channelId, f.buyer2Id, '50', new Date('2026-04-01T01:00:00Z'));
    const byMonth = await reports.revenue(f.tenantId, { groupBy: 'month' });
    expect(byMonth.map((b) => b.key)).toEqual(['2026-03', '2026-04']);
  });

  it('respects from/to date filters', async () => {
    const f = await setupFixture('rev3');
    await makeSale(f, 'A', f.channelId, f.buyer1Id, '100', new Date('2026-01-10T00:00:00Z'));
    await makeSale(f, 'B', f.channelId, f.buyer1Id, '200', new Date('2026-06-15T00:00:00Z'));
    const filtered = await reports.revenue(f.tenantId, {
      groupBy: 'month',
      from: new Date('2026-06-01T00:00:00Z'),
      to: new Date('2026-12-31T00:00:00Z'),
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.revenueBase).toBe('200.0000');
  });
});

describe('reports — inventory', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('counts pieces by status', async () => {
    const { tenantId, userId } = await seedTenant('inv');
    const p1 = await pieces.create(tenantId, { title: 'A' });
    const p2 = await pieces.create(tenantId, { title: 'B' });
    await pieces.transitionStatus(tenantId, userId, p2.id, { to: 'in_studio' });
    void p1;

    const inv = await reports.inventory(tenantId, { groupBy: 'status' });
    const byKey = new Map(inv.map((r) => [r.key, r.count] as const));
    expect(byKey.get('in_progress')).toBe(1);
    expect(byKey.get('in_studio')).toBe(1);
  });
});

describe('reports — CSV round-trip', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('Papa.unparse of revenue buckets parses back to the same rows', async () => {
    const f = await setupFixture('csv');
    await makeSale(f, 'P', f.channelId, f.buyer1Id, '100', new Date('2026-03-15T12:00:00Z'));
    const rows = await reports.revenue(f.tenantId, { groupBy: 'month' });
    const csv = Papa.unparse(rows);
    const parsed = Papa.parse(csv, { header: true, dynamicTyping: false }).data as Array<Record<string, string>>;
    expect(parsed).toHaveLength(rows.length);
    expect(parsed[0]?.label).toBe(rows[0]?.label);
    expect(parsed[0]?.revenueBase).toBe(rows[0]?.revenueBase);
  });
});
