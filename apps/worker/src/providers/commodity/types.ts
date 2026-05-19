/**
 * Commodity price provider interface. Implementations live alongside this
 * file. v1 ships a fake (test-only) and a stub for metals.dev — the latter
 * is wired up but not exercised against the real API in CI.
 */

export interface CommodityQuote {
  symbol: string; // ISO 4217-ish: XAU, XAG, XPT, ...
  pricePerGram: number; // canonical unit
  currency: string; // ISO 4217 (USD, EUR, ...)
  fetchedAt: Date;
}

export interface CommodityPriceProvider {
  readonly name: string;
  fetch(symbols: string[]): Promise<CommodityQuote[]>;
}
