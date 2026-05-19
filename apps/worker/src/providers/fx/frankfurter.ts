import { logger } from '@aura/logger';
import type { FxProvider, FxRate } from './types.js';

/**
 * Stub for frankfurter.app. No API key required; rates are ECB-derived.
 * v1 ships the interface; full integration exercise lives in Phase 9.
 */
export class FrankfurterProvider implements FxProvider {
  readonly name = 'frankfurter';
  constructor(private readonly endpoint = 'https://api.frankfurter.app') {}

  async getRate(base: string, quote: string): Promise<FxRate> {
    if (base === quote) return { base, quote, rate: 1, fetchedAt: new Date() };
    const url = `${this.endpoint}/latest?from=${base}&to=${quote}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.error({ status: res.status, body }, 'frankfurter fetch failed');
      throw new Error(`frankfurter returned ${res.status}`);
    }
    const json = (await res.json()) as { rates?: Record<string, number>; date?: string };
    const rate = json.rates?.[quote];
    if (typeof rate !== 'number') {
      throw new Error(`frankfurter response missing rate ${base}->${quote}`);
    }
    return {
      base,
      quote,
      rate,
      fetchedAt: json.date ? new Date(json.date) : new Date(),
    };
  }
}
