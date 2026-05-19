import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { disconnect, resetDb } from '@/__tests__/helpers/db';
import { seedTenant } from '@/__tests__/helpers/seed';
import * as materials from '../../service.js';

describe('materials integration', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('creates and lists a material', async () => {
    const { tenantId } = await seedTenant('mat');
    const m = await materials.create(tenantId, { name: 'Gold', unit: 'g', kind: 'commodity', commoditySymbol: 'XAU' });
    expect(m.name).toBe('Gold');
    expect(m.kind).toBe('commodity');
    const list = await materials.list(tenantId);
    expect(list).toHaveLength(1);
    expect(list[0]?.commoditySymbol).toBe('XAU');
  });

  it('rejects commodity material without symbol via schema', async () => {
    const { createMaterialSchema } = await import('../../schema.js');
    const r = createMaterialSchema.safeParse({ name: 'Bad', unit: 'g', kind: 'commodity' });
    expect(r.success).toBe(false);
  });

  it('records manual prices and returns history newest-first', async () => {
    const { tenantId, userId } = await seedTenant('mat-hist');
    const m = await materials.create(tenantId, { name: 'Silver', unit: 'g', kind: 'commodity', commoditySymbol: 'XAG' });

    const earlier = new Date('2026-01-01T00:00:00Z');
    const later = new Date('2026-02-01T00:00:00Z');
    await materials.recordManualPrice(tenantId, m.id, userId, {
      pricePerUnit: '0.80', currency: 'USD', fxRateToBase: '1', effectiveAt: earlier,
    });
    await materials.recordManualPrice(tenantId, m.id, userId, {
      pricePerUnit: '0.92', currency: 'USD', fxRateToBase: '1', effectiveAt: later,
    });
    const hist = await materials.listPrices(tenantId, m.id, { limit: 10 });
    expect(hist).toHaveLength(2);
    expect(hist[0]?.pricePerUnit).toBe('0.92'); // newest first
    expect(hist[1]?.pricePerUnit).toBe('0.8'); // Prisma Decimal toString trims trailing zeros
  });

  it('currentPrices returns latest per (material, source)', async () => {
    const { tenantId, userId } = await seedTenant('mat-cur');
    const m = await materials.create(tenantId, { name: 'Gold', unit: 'g', kind: 'commodity', commoditySymbol: 'XAU' });
    // Two manual entries — newest should win.
    await materials.recordManualPrice(tenantId, m.id, userId, {
      pricePerUnit: '60.00', currency: 'USD', fxRateToBase: '1',
      effectiveAt: new Date('2026-01-01T00:00:00Z'),
    });
    await materials.recordManualPrice(tenantId, m.id, userId, {
      pricePerUnit: '65.00', currency: 'USD', fxRateToBase: '1',
      effectiveAt: new Date('2026-03-01T00:00:00Z'),
    });
    const current = await materials.currentPrices(tenantId, m.id);
    expect(current).toHaveLength(1);
    expect(current[0]?.pricePerUnit).toBe('65');
    expect(current[0]?.source).toBe('manual');
  });

  it('soft-deletes materials but keeps them visible when includeInactive=true', async () => {
    const { tenantId } = await seedTenant('mat-soft');
    const m = await materials.create(tenantId, { name: 'Wood', unit: 'piece', kind: 'wood' });
    await materials.deactivate(tenantId, m.id);
    expect(await materials.list(tenantId)).toHaveLength(0);
    expect(await materials.list(tenantId, true)).toHaveLength(1);
  });
});

describe('materials — tenant isolation', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('refuses cross-tenant reads, writes, and price recording', async () => {
    const a = await seedTenant('iso-a');
    const b = await seedTenant('iso-b');
    const mA = await materials.create(a.tenantId, { name: 'Gold A', unit: 'g', kind: 'other' });

    // Tenant B cannot read tenant A's material.
    expect(await import('../../repo.js').then((r) => r.getMaterialById(b.tenantId, mA.id))).toBeNull();
    // Tenant B's list does not include it.
    expect((await materials.list(b.tenantId)).find((m) => m.id === mA.id)).toBeUndefined();
    // Tenant B cannot record a manual price against tenant A's material.
    await expect(
      materials.recordManualPrice(b.tenantId, mA.id, b.userId, {
        pricePerUnit: '1.00', currency: 'USD', fxRateToBase: '1', effectiveAt: new Date(),
      }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});
