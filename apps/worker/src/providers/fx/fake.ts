import type { FxProvider, FxRate } from './types.js';

/**
 * Deterministic FX provider. Defaults to 1.0 for the base→quote pair
 * unless overridden via constructor.
 */
export class FakeFxProvider implements FxProvider {
  readonly name = 'fake';
  constructor(private readonly rates: Record<string, number> = {}) {}

  async getRate(base: string, quote: string): Promise<FxRate> {
    if (base === quote) return { base, quote, rate: 1, fetchedAt: new Date() };
    const key = `${base}->${quote}`;
    const rate = this.rates[key] ?? 1;
    return { base, quote, rate, fetchedAt: new Date() };
  }
}
