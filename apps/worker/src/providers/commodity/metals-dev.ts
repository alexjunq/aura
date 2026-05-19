import { logger } from '@aura/logger';
import type { CommodityPriceProvider, CommodityQuote } from './types.js';

/**
 * Stub for metals.dev. The real call signature is documented at
 * https://metals.dev/docs/api; we leave the request shape conservative
 * and well-isolated so a future replacement is a single-file change.
 *
 * v1 just wires the interface; the integration is exercised manually
 * before release (Phase 9), guarded by env.
 */
export class MetalsDevProvider implements CommodityPriceProvider {
  readonly name = 'metals_dev';

  constructor(
    private readonly apiKey: string,
    private readonly endpoint = 'https://api.metals.dev/v1/latest',
  ) {}

  async fetch(symbols: string[]): Promise<CommodityQuote[]> {
    if (symbols.length === 0) return [];
    const params = new URLSearchParams({
      api_key: this.apiKey,
      currency: 'USD',
      unit: 'g',
      metals: symbols.join(','),
    });
    const url = `${this.endpoint}?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.error({ status: res.status, body }, 'metals.dev fetch failed');
      throw new Error(`metals.dev returned ${res.status}`);
    }
    const json = (await res.json()) as { metals?: Record<string, number>; timestamp?: string };
    const fetchedAt = json.timestamp ? new Date(json.timestamp) : new Date();
    const quotes: CommodityQuote[] = [];
    for (const symbol of symbols) {
      const price = json.metals?.[symbol];
      if (typeof price !== 'number') continue;
      quotes.push({ symbol, pricePerGram: price, currency: 'USD', fetchedAt });
    }
    return quotes;
  }
}
