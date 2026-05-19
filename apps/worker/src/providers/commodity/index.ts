import { loadEnv } from '@aura/config';
import { FakeCommodityPriceProvider } from './fake.js';
import { MetalsDevProvider } from './metals-dev.js';
import type { CommodityPriceProvider } from './types.js';

export type { CommodityPriceProvider, CommodityQuote } from './types.js';
export { FakeCommodityPriceProvider } from './fake.js';

let cached: CommodityPriceProvider | undefined;

export function getCommodityProvider(): CommodityPriceProvider {
  if (cached) return cached;
  const env = loadEnv();
  switch (env.COMMODITY_PROVIDER) {
    case 'metals_dev':
      if (!env.COMMODITY_API_KEY) {
        throw new Error('COMMODITY_API_KEY required for metals_dev provider');
      }
      cached = new MetalsDevProvider(env.COMMODITY_API_KEY);
      return cached;
    case 'goldapi':
      throw new Error('goldapi provider not yet implemented');
    case 'fake':
    default:
      cached = new FakeCommodityPriceProvider();
      return cached;
  }
}

export function resetCommodityProviderCache(): void {
  cached = undefined;
}
