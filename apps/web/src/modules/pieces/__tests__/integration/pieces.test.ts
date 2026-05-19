import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { disconnect, resetDb } from '@/__tests__/helpers/db';
import { seedTenant } from '@/__tests__/helpers/seed';
import * as pieces from '../../service.js';
import * as materials from '@/modules/materials/service';

describe('pieces — create + slug auto-gen', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('auto-generates a slug from the title', async () => {
    const { tenantId } = await seedTenant('p1');
    const p = await pieces.create(tenantId, { title: 'Hello World!' });
    expect(p.slug).toBe('hello-world');
  });

  it('dedupes slugs within the tenant', async () => {
    const { tenantId } = await seedTenant('p2');
    const a = await pieces.create(tenantId, { title: 'Ring' });
    const b = await pieces.create(tenantId, { title: 'Ring' });
    const c = await pieces.create(tenantId, { title: 'Ring' });
    expect(a.slug).toBe('ring');
    expect(b.slug).toBe('ring-2');
    expect(c.slug).toBe('ring-3');
  });

  it('does not dedupe across tenants', async () => {
    const a = await seedTenant('iso-pa');
    const b = await seedTenant('iso-pb');
    const pa = await pieces.create(a.tenantId, { title: 'Brooch' });
    const pb = await pieces.create(b.tenantId, { title: 'Brooch' });
    expect(pa.slug).toBe('brooch');
    expect(pb.slug).toBe('brooch');
  });

  it('initial status is in_progress and startedAt is stamped', async () => {
    const { tenantId } = await seedTenant('p4');
    const p = await pieces.create(tenantId, { title: 'X' });
    expect(p.status).toBe('in_progress');
    expect(p.startedAt).toBeTruthy();
    expect(p.finishedAt).toBeNull();
  });
});

describe('pieces — status transitions', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('happy path in_progress → in_studio → lost_damaged works; sold/returned rejected', async () => {
    const { tenantId, userId } = await seedTenant('st');
    const p = await pieces.create(tenantId, { title: 'Vase' });

    const p2 = await pieces.transitionStatus(tenantId, userId, p.id, { to: 'in_studio' });
    expect(p2.status).toBe('in_studio');
    expect(p2.finishedAt).toBeTruthy(); // stamped on first leave from in_progress

    // Direct transition to sold should be rejected (must come from sale).
    await expect(
      pieces.transitionStatus(tenantId, userId, p.id, { to: 'sold', context: { saleId: 'fake' } }),
    ).rejects.toMatchObject({ code: 'illegal_transition' });

    // To lost_damaged is legal from in_studio.
    const p3 = await pieces.transitionStatus(tenantId, userId, p.id, { to: 'lost_damaged' });
    expect(p3.status).toBe('lost_damaged');
  });

  it('requires channelId for on_sale / reserved', async () => {
    const { tenantId, userId } = await seedTenant('ch');
    const p = await pieces.create(tenantId, { title: 'Necklace' });
    await pieces.transitionStatus(tenantId, userId, p.id, { to: 'in_studio' });
    await expect(
      pieces.transitionStatus(tenantId, userId, p.id, { to: 'on_sale' }),
    ).rejects.toMatchObject({ code: 'illegal_transition' });
    await expect(
      pieces.transitionStatus(tenantId, userId, p.id, { to: 'reserved' }),
    ).rejects.toMatchObject({ code: 'illegal_transition' });
    // With channelId it succeeds.
    const p2 = await pieces.transitionStatus(tenantId, userId, p.id, {
      to: 'on_sale',
      context: { channelId: 'ch1' },
    });
    expect(p2.status).toBe('on_sale');
  });

  it('writes a status history row on every transition', async () => {
    const { tenantId, userId } = await seedTenant('hist');
    const p = await pieces.create(tenantId, { title: 'X' });
    await pieces.transitionStatus(tenantId, userId, p.id, { to: 'in_studio' });
    const hist = await pieces.statusHistory(tenantId, p.id);
    expect(hist).toHaveLength(1);
    expect(hist[0]?.fromStatus).toBe('in_progress');
    expect(hist[0]?.toStatus).toBe('in_studio');
    expect(hist[0]?.userId).toBe(userId);
  });
});

describe('pieces — material snapshot pricing', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('snapshots current price and stays stable after later price updates', async () => {
    const { tenantId, userId } = await seedTenant('snap');
    const m = await materials.create(tenantId, { name: 'Gold', unit: 'g', kind: 'commodity', commoditySymbol: 'XAU' });
    await materials.recordManualPrice(tenantId, m.id, userId, {
      pricePerUnit: '60.00', currency: 'USD', fxRateToBase: '1', effectiveAt: new Date(),
    });

    const piece = await pieces.create(tenantId, { title: 'Ring' });
    const pm = await pieces.addMaterial(tenantId, piece.id, { materialId: m.id, quantity: '2' });
    expect(pm.capturedPricePerUnit).toBe('60');

    // Update material price upward; piece's captured price should be unchanged.
    await materials.recordManualPrice(tenantId, m.id, userId, {
      pricePerUnit: '90.00', currency: 'USD', fxRateToBase: '1',
      effectiveAt: new Date(Date.now() + 60_000),
    });
    const after = await pieces.listMaterials(tenantId, piece.id);
    expect(after[0]?.capturedPricePerUnit).toBe('60');
    const cost = await pieces.materialsCostBase(tenantId, piece.id);
    expect(cost).toBe('120.0000'); // 60 * 2
  });

  it('rejects adding materials once piece leaves in_progress', async () => {
    const { tenantId, userId } = await seedTenant('snap2');
    const m = await materials.create(tenantId, { name: 'Silver', unit: 'g', kind: 'commodity', commoditySymbol: 'XAG' });
    await materials.recordManualPrice(tenantId, m.id, userId, {
      pricePerUnit: '1', currency: 'USD', fxRateToBase: '1', effectiveAt: new Date(),
    });
    const piece = await pieces.create(tenantId, { title: 'X' });
    await pieces.transitionStatus(tenantId, userId, piece.id, { to: 'in_studio' });
    await expect(
      pieces.addMaterial(tenantId, piece.id, { materialId: m.id, quantity: '1' }),
    ).rejects.toMatchObject({ code: 'illegal_transition' });
  });
});

describe('pieces — work sessions', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('start + stop produces a session with positive duration', async () => {
    const { tenantId } = await seedTenant('ts1');
    const p = await pieces.create(tenantId, { title: 'X' });
    const s = await pieces.startSession(tenantId, p.id);
    expect(s.endedAt).toBeNull();
    // Wait a tiny bit so the duration isn't zero.
    await new Promise((r) => setTimeout(r, 50));
    const stopped = await pieces.stopSession(tenantId, s.id, 'notes');
    expect(stopped.endedAt).toBeTruthy();
    expect(stopped.durationSeconds).toBeGreaterThanOrEqual(0);
    expect(stopped.note).toBe('notes');
  });

  it('rejects starting a second timer while one is active for the tenant', async () => {
    const { tenantId } = await seedTenant('ts2');
    const p1 = await pieces.create(tenantId, { title: 'A' });
    const p2 = await pieces.create(tenantId, { title: 'B' });
    await pieces.startSession(tenantId, p1.id);
    await expect(pieces.startSession(tenantId, p2.id)).rejects.toMatchObject({
      code: 'conflict',
    });
  });

  it('records manual sessions and sums durations', async () => {
    const { tenantId } = await seedTenant('ts3');
    const p = await pieces.create(tenantId, { title: 'X' });
    await pieces.recordSession(tenantId, p.id, {
      startedAt: new Date('2026-01-01T10:00:00Z'),
      endedAt: new Date('2026-01-01T11:00:00Z'),
      note: null,
    });
    await pieces.recordSession(tenantId, p.id, {
      startedAt: new Date('2026-01-02T10:00:00Z'),
      endedAt: new Date('2026-01-02T10:30:00Z'),
      note: null,
    });
    const total = await pieces.totalSessionSeconds(tenantId, p.id);
    expect(total).toBe(3600 + 1800);
  });
});

describe('pieces — tenant isolation', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('cross-tenant access is refused everywhere', async () => {
    const a = await seedTenant('iso-pca');
    const b = await seedTenant('iso-pcb');
    const pA = await pieces.create(a.tenantId, { title: 'A piece' });

    // Tenant B cannot get tenant A's piece.
    await expect(pieces.get(b.tenantId, pA.id)).rejects.toMatchObject({ code: 'not_found' });

    // Tenant B's list does not include it.
    expect((await pieces.list(b.tenantId, {})).find((p) => p.id === pA.id)).toBeUndefined();

    // Tenant B cannot transition tenant A's piece.
    await expect(
      pieces.transitionStatus(b.tenantId, b.userId, pA.id, { to: 'in_studio' }),
    ).rejects.toMatchObject({ code: 'not_found' });

    // Tenant B cannot start a timer on tenant A's piece.
    await expect(pieces.startSession(b.tenantId, pA.id)).rejects.toMatchObject({ code: 'not_found' });
  });
});
