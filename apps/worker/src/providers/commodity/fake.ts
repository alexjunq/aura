import type { CommodityPriceProvider, CommodityQuote } from './types.js';

/**
 * Deterministic test double. Returns a fixed quote per known symbol plus
 * a counter so repeated runs produce different effectiveAt timestamps.
 */
export class FakeCommodityPriceProvider implements CommodityPriceProvider {
  readonly name = 'fake';
  private fetchCount = 0;

  /** Symbol → USD price per gram. Caller can extend via constructor. */
  constructor(private readonly prices: Record<string, number> = DEFAULT_PRICES) {}

  async fetch(symbols: string[]): Promise<CommodityQuote[]> {
    this.fetchCount++;
    const now = new Date();
    const quotes: CommodityQuote[] = [];
    for (const symbol of symbols) {
      const price = this.prices[symbol];
      if (price === undefined) continue; // unknown symbols silently dropped
      quotes.push({
        symbol,
        pricePerGram: price,
        currency: 'USD',
        fetchedAt: now,
      });
    }
    return quotes;
  }

  get callCount(): number {
    return this.fetchCount;
  }
}

const DEFAULT_PRICES: Record<string, number> = {
  XAU: 70.0, // gold per gram USD (approx)
  XAG: 0.85, // silver per gram USD
  XPT: 35.0, // platinum per gram USD
};
