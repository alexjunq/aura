import { loadEnv } from '@aura/config';
import { FakeFxProvider } from './fake.js';
import { FrankfurterProvider } from './frankfurter.js';
import type { FxProvider } from './types.js';

export type { FxProvider, FxRate } from './types.js';
export { FakeFxProvider } from './fake.js';

let cached: FxProvider | undefined;

export function getFxProvider(): FxProvider {
  if (cached) return cached;
  const env = loadEnv();
  switch (env.FX_PROVIDER) {
    case 'frankfurter':
      cached = new FrankfurterProvider();
      return cached;
    case 'fake':
    default:
      cached = new FakeFxProvider();
      return cached;
  }
}

export function resetFxProviderCache(): void {
  cached = undefined;
}
