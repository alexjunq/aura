import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@aura/db';
import { runCommodityFeed } from '../../jobs/commodity-feed.js';
import { FakeCommodityPriceProvider } from '../../providers/commodity/fake.js';
import { FakeFxProvider } from '../../providers/fx/fake.js';

async function reset() {
  await prisma.$transaction([
    prisma.materialPrice.deleteMany(),
    prisma.material.deleteMany(),
    prisma.user.deleteMany(),
    prisma.tenant.deleteMany(),
  ]);
}

describe('commodity-feed (Flow E)', () => {
  beforeEach(reset);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('inserts a feed-source price for each (tenant × matching material) and stamps lastFeedFetchedAt', async () => {
    const t1 = await prisma.tenant.create({ data: { name: 'T1', baseCurrency: 'USD' } });
    const t2 = await prisma.tenant.create({ data: { name: 'T2', baseCurrency: 'EUR' } });
    const m1 = await prisma.material.create({
      data: { tenantId: t1.id, name: 'Gold', unit: 'g', kind: 'commodity', commoditySymbol: 'XAU' },
    });
    const m2 = await prisma.material.create({
      data: { tenantId: t2.id, name: 'Gold (T2)', unit: 'g', kind: 'commodity', commoditySymbol: 'XAU' },
    });

    const provider = new FakeCommodityPriceProvider({ XAU: 70 });
    // 1 USD = 0.92 EUR for tenant T2.
    const fx = new FakeFxProvider({ 'USD->EUR': 0.92, 'USD->USD': 1 });
    const result = await runCommodityFeed(provider, fx);

    expect(result.inserted).toBe(2);
    expect(result.tenantsAffected).toBe(2);
    expect(result.failures).toBe(0);

    const p1 = await prisma.materialPrice.findFirst({ where: { tenantId: t1.id, materialId: m1.id } });
    expect(p1?.source).toBe('feed');
    expect(p1?.pricePerUnit.toString()).toBe('70');
    expect(p1?.currency).toBe('USD');
    expect(p1?.fxRateToBase.toString()).toBe('1');

    const p2 = await prisma.materialPrice.findFirst({ where: { tenantId: t2.id, materialId: m2.id } });
    expect(p2?.source).toBe('feed');
    expect(p2?.fxRateToBase.toString()).toBe('0.92');

    // Both materials stamped.
    const m1after = await prisma.material.findUnique({ where: { id: m1.id } });
    const m2after = await prisma.material.findUnique({ where: { id: m2.id } });
    expect(m1after?.lastFeedFetchedAt).toBeTruthy();
    expect(m2after?.lastFeedFetchedAt).toBeTruthy();
  });

  it('skips materials with symbols the provider does not return', async () => {
    const t = await prisma.tenant.create({ data: { name: 'T', baseCurrency: 'USD' } });
    await prisma.material.create({
      data: { tenantId: t.id, name: 'Unknown', unit: 'g', kind: 'commodity', commoditySymbol: 'UNK' },
    });
    const provider = new FakeCommodityPriceProvider({ XAU: 70 }); // no UNK
    const result = await runCommodityFeed(provider, new FakeFxProvider());
    expect(result.inserted).toBe(0);
  });

  it('isolates failures: when one tenant throws, others still get prices', async () => {
    const t1 = await prisma.tenant.create({ data: { name: 'T1', baseCurrency: 'USD' } });
    const t2 = await prisma.tenant.create({ data: { name: 'T2', baseCurrency: 'EUR' } });
    await prisma.material.create({
      data: { tenantId: t1.id, name: 'Gold', unit: 'g', kind: 'commodity', commoditySymbol: 'XAU' },
    });
    await prisma.material.create({
      data: { tenantId: t2.id, name: 'Gold T2', unit: 'g', kind: 'commodity', commoditySymbol: 'XAU' },
    });

    // FX provider throws for USD->EUR (simulating an upstream outage) but
    // USD->USD short-circuits to rate=1 inside the provider.
    class FlakyFx extends FakeFxProvider {
      override async getRate(base: string, quote: string) {
        if (base === 'USD' && quote === 'EUR') {
          throw new Error('FX upstream down for EUR');
        }
        return super.getRate(base, quote);
      }
    }
    const result = await runCommodityFeed(new FakeCommodityPriceProvider({ XAU: 70 }), new FlakyFx());
    expect(result.failures).toBe(1);
    expect(result.tenantsAffected).toBe(1); // only T1 succeeded
    expect(result.inserted).toBe(1);
  });
});
