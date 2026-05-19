import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { disconnect, resetDb } from '@/__tests__/helpers/db';
import { seedTenant } from '@/__tests__/helpers/seed';
import * as suppliers from '../../service.js';
import * as materials from '@/modules/materials/service';

describe('suppliers integration', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('CRUD round-trip', async () => {
    const { tenantId } = await seedTenant('sup');
    const s = await suppliers.create(tenantId, { name: 'Acme Metals', email: 'sales@acme.com' });
    expect(s.name).toBe('Acme Metals');
    const all = await suppliers.list(tenantId);
    expect(all).toHaveLength(1);
    const updated = await suppliers.update(tenantId, s.id, { phone: '+1 555' });
    expect(updated.phone).toBe('+1 555');
    await suppliers.deactivate(tenantId, s.id);
    expect(await suppliers.list(tenantId)).toHaveLength(0);
    expect(await suppliers.list(tenantId, true)).toHaveLength(1);
  });

  it('links and unlinks materials', async () => {
    const { tenantId } = await seedTenant('sup-link');
    const s = await suppliers.create(tenantId, { name: 'Vendor X' });
    const m = await materials.create(tenantId, { name: 'Gold', unit: 'g', kind: 'commodity', commoditySymbol: 'XAU' });
    const link = await suppliers.linkMaterial(tenantId, s.id, { materialId: m.id, sku: 'AU-001', defaultLeadTimeDays: 7 });
    expect(link.sku).toBe('AU-001');
    const list = await suppliers.listMaterials(tenantId, s.id);
    expect(list).toHaveLength(1);
    await suppliers.unlinkMaterial(tenantId, s.id, m.id);
    expect(await suppliers.listMaterials(tenantId, s.id)).toHaveLength(0);
  });

  it('refuses linking across tenants', async () => {
    const a = await seedTenant('iso-sup-a');
    const b = await seedTenant('iso-sup-b');
    const sA = await suppliers.create(a.tenantId, { name: 'A vendor' });
    const mB = await materials.create(b.tenantId, { name: 'B material', unit: 'g', kind: 'other' });
    // Tenant A tries to link tenant B's material to its supplier.
    await expect(
      suppliers.linkMaterial(a.tenantId, sA.id, { materialId: mB.id }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('supplier prices — write through materials.recordSupplierPrice', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('writes a supplier-source price row and exposes it via currentPrices', async () => {
    const { tenantId, userId } = await seedTenant('sup-price');
    const s = await suppliers.create(tenantId, { name: 'Acme' });
    const m = await materials.create(tenantId, { name: 'Gold', unit: 'g', kind: 'commodity', commoditySymbol: 'XAU' });

    await materials.recordSupplierPrice(tenantId, m.id, userId, {
      supplierId: s.id,
      pricePerUnit: '70.00',
      currency: 'USD',
      fxRateToBase: '1',
      effectiveAt: new Date('2026-04-01T00:00:00Z'),
    });

    const current = await materials.currentPrices(tenantId, m.id);
    expect(current).toHaveLength(1);
    expect(current[0]?.source).toBe('supplier');
    expect(current[0]?.supplierId).toBe(s.id);
    expect(current[0]?.pricePerUnit).toBe('70');
  });
});
