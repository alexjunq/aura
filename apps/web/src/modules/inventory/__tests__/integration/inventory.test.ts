import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@aura/db';
import { disconnect, resetDb } from '@/__tests__/helpers/db';
import { seedTenant } from '@/__tests__/helpers/seed';
import * as inventory from '../../service.js';
import * as materials from '@/modules/materials/service';
import * as suppliers from '@/modules/suppliers/service';
import * as pieces from '@/modules/pieces/service';

async function seedTenantWithSupplierAndMaterial(label: string) {
  const t = await seedTenant(label);
  const supplier = await suppliers.create(t.tenantId, { name: 'Acme Metals' });
  const material = await materials.create(t.tenantId, {
    name: 'Silver',
    unit: 'g',
    kind: 'commodity',
    commoditySymbol: 'XAG',
  });
  return { ...t, supplierId: supplier.id, materialId: material.id };
}

describe('inventory — recordPurchase', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('writes a purchase movement AND a supplier-source material_price', async () => {
    const f = await seedTenantWithSupplierAndMaterial('p1');
    const m = await inventory.recordPurchase(f.tenantId, f.userId, {
      materialId: f.materialId,
      supplierId: f.supplierId,
      quantity: '100',
      unitCost: '0.85',
      currency: 'USD',
      fxRateToBase: '1',
      occurredAt: new Date('2026-05-01T12:00:00Z'),
      reference: 'PO-42',
    });
    expect(m.kind).toBe('purchase');
    expect(m.quantity).toBe('100');
    expect(m.supplierId).toBe(f.supplierId);
    expect(m.unitCost).toBe('0.85');

    // The matching material_price row should now exist.
    const current = await materials.currentPrices(f.tenantId, f.materialId);
    const supplierRow = current.find((p) => p.source === 'supplier');
    expect(supplierRow).toBeDefined();
    expect(supplierRow?.pricePerUnit).toBe('0.85');
    expect(supplierRow?.supplierId).toBe(f.supplierId);
  });

  it('stock report shows the purchased quantity on hand', async () => {
    const f = await seedTenantWithSupplierAndMaterial('p2');
    await inventory.recordPurchase(f.tenantId, f.userId, {
      materialId: f.materialId,
      supplierId: f.supplierId,
      quantity: '50',
      unitCost: '1',
      currency: 'USD',
      fxRateToBase: '1',
      occurredAt: new Date(),
    });
    const report = await inventory.currentInventory(f.tenantId);
    const silver = report.find((r) => r.materialId === f.materialId);
    expect(silver?.onHand).toBe('50');
  });

  it('refuses cross-tenant purchases', async () => {
    const a = await seedTenantWithSupplierAndMaterial('iso-a');
    const b = await seedTenant('iso-b');
    await expect(
      inventory.recordPurchase(b.tenantId, b.userId, {
        materialId: a.materialId,
        supplierId: a.supplierId,
        quantity: '10',
        unitCost: '1',
        currency: 'USD',
        fxRateToBase: '1',
        occurredAt: new Date(),
      }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('CHECK constraint rejects a purchase row without supplier (defense in depth)', async () => {
    const f = await seedTenantWithSupplierAndMaterial('chk');
    await expect(
      prisma.inventoryMovement.create({
        data: {
          tenantId: f.tenantId,
          materialId: f.materialId,
          kind: 'purchase',
          quantity: '10',
          supplierId: null,
          unitCost: null,
          currency: null,
          fxRateToBase: null,
          pieceId: null,
          occurredAt: new Date(),
        },
      }),
    ).rejects.toThrow();
  });
});

describe('inventory ↔ pieces integration', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('addMaterial decrements stock; removeMaterial restores it', async () => {
    const f = await seedTenantWithSupplierAndMaterial('pwx');
    await inventory.recordPurchase(f.tenantId, f.userId, {
      materialId: f.materialId,
      supplierId: f.supplierId,
      quantity: '100',
      unitCost: '1',
      currency: 'USD',
      fxRateToBase: '1',
      occurredAt: new Date(),
    });

    const piece = await pieces.create(f.tenantId, { title: 'Ring' });
    await pieces.addMaterial(f.tenantId, f.userId, piece.id, {
      materialId: f.materialId,
      quantity: '30',
    });

    let stock = await inventory.currentInventory(f.tenantId);
    expect(stock.find((r) => r.materialId === f.materialId)?.onHand).toBe('70');

    await pieces.removeMaterial(f.tenantId, piece.id, f.materialId);
    stock = await inventory.currentInventory(f.tenantId);
    expect(stock.find((r) => r.materialId === f.materialId)?.onHand).toBe('100');
  });

  it('re-adding a material to the same piece updates the usage movement instead of stacking', async () => {
    const f = await seedTenantWithSupplierAndMaterial('upd');
    await inventory.recordPurchase(f.tenantId, f.userId, {
      materialId: f.materialId,
      supplierId: f.supplierId,
      quantity: '100',
      unitCost: '1',
      currency: 'USD',
      fxRateToBase: '1',
      occurredAt: new Date(),
    });
    const piece = await pieces.create(f.tenantId, { title: 'A' });
    await pieces.addMaterial(f.tenantId, f.userId, piece.id, {
      materialId: f.materialId,
      quantity: '10',
    });
    await pieces.addMaterial(f.tenantId, f.userId, piece.id, {
      materialId: f.materialId,
      quantity: '25',
    });
    const stock = await inventory.currentInventory(f.tenantId);
    expect(stock.find((r) => r.materialId === f.materialId)?.onHand).toBe('75'); // 100 - 25
    const movements = await inventory.listMovements(f.tenantId, f.materialId);
    expect(movements.filter((m) => m.kind === 'usage')).toHaveLength(1);
  });
});

describe('inventory — adjustment', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('records a signed write-down and shows up in current inventory', async () => {
    const f = await seedTenantWithSupplierAndMaterial('adj');
    await inventory.recordPurchase(f.tenantId, f.userId, {
      materialId: f.materialId,
      supplierId: f.supplierId,
      quantity: '20',
      unitCost: '1',
      currency: 'USD',
      fxRateToBase: '1',
      occurredAt: new Date(),
    });
    await inventory.recordAdjustment(f.tenantId, f.userId, {
      materialId: f.materialId,
      quantity: '-5',
      reference: 'breakage',
      occurredAt: new Date(),
    });
    const stock = await inventory.currentInventory(f.tenantId);
    expect(stock.find((r) => r.materialId === f.materialId)?.onHand).toBe('15');
  });
});
