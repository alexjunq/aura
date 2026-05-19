import { prisma } from '@aura/db';
import { logger } from '@aura/logger';
import type { CommodityPriceProvider } from '../providers/commodity/index.js';
import type { FxProvider } from '../providers/fx/index.js';

/**
 * Daily commodity feed (spec §7 Flow E).
 *
 * Algorithm:
 *  1. Pull distinct `commodity_symbol`s across all tenants where
 *     `material.kind = 'commodity'` AND `commodity_symbol IS NOT NULL`.
 *  2. Fetch quotes (USD, per gram) from the configured provider.
 *  3. For each tenant × material that uses one of those symbols:
 *       - Resolve fx from the quote's currency into the tenant's
 *         baseCurrency via the FX provider (cached per pair within one run).
 *       - Insert a `material_price` row with source='feed', captured
 *         fxRateToBase, pricePerUnit (after unit math — for now we
 *         assume the material's unit is 'g'; future versions can
 *         convert).
 *       - Update `material.lastFeedFetchedAt` on success.
 *  4. Per-tenant failures are logged and isolated.
 */
export async function runCommodityFeed(
  provider: CommodityPriceProvider,
  fx: FxProvider,
  now: Date = new Date(),
): Promise<{ inserted: number; tenantsAffected: number; failures: number }> {
  const symbolsRows = await prisma.material.findMany({
    where: {
      kind: 'commodity',
      commoditySymbol: { not: null },
      active: true,
    },
    select: { commoditySymbol: true },
    distinct: ['commoditySymbol'],
  });
  const symbols = symbolsRows
    .map((r) => r.commoditySymbol)
    .filter((s): s is string => !!s);

  if (symbols.length === 0) {
    logger.info('commodity-feed: no commodity materials registered; skipping fetch');
    return { inserted: 0, tenantsAffected: 0, failures: 0 };
  }

  const quotes = await provider.fetch(symbols);
  const quotesBySymbol = new Map(quotes.map((q) => [q.symbol, q] as const));

  const fxCache = new Map<string, number>();
  async function rate(base: string, quote: string): Promise<number> {
    const key = `${base}->${quote}`;
    if (fxCache.has(key)) return fxCache.get(key) as number;
    const r = await fx.getRate(base, quote);
    fxCache.set(key, r.rate);
    return r.rate;
  }

  let inserted = 0;
  const affectedTenants = new Set<string>();
  let failures = 0;

  // For each tenant, find materials with quoted symbols and insert prices.
  const tenants = await prisma.tenant.findMany({ select: { id: true, baseCurrency: true } });
  for (const tenant of tenants) {
    try {
      const materials = await prisma.material.findMany({
        where: {
          tenantId: tenant.id,
          kind: 'commodity',
          active: true,
          commoditySymbol: { in: symbols },
        },
      });
      for (const m of materials) {
        const quote = m.commoditySymbol ? quotesBySymbol.get(m.commoditySymbol) : undefined;
        if (!quote) continue;
        const fxRate = await rate(quote.currency, tenant.baseCurrency);
        await prisma.materialPrice.create({
          data: {
            tenantId: tenant.id,
            materialId: m.id,
            source: 'feed',
            supplierId: null,
            pricePerUnit: quote.pricePerGram.toString(),
            currency: quote.currency,
            fxRateToBase: fxRate.toString(),
            effectiveAt: now,
            createdByUserId: null,
          },
        });
        await prisma.material.update({
          where: { id: m.id },
          data: { lastFeedFetchedAt: now },
        });
        inserted++;
        affectedTenants.add(tenant.id);
      }
    } catch (err) {
      failures++;
      logger.error({ err, tenantId: tenant.id }, 'commodity-feed: tenant failed; isolating');
    }
  }

  logger.info(
    { inserted, tenantsAffected: affectedTenants.size, failures, symbols },
    'commodity-feed run complete',
  );
  return { inserted, tenantsAffected: affectedTenants.size, failures };
}
