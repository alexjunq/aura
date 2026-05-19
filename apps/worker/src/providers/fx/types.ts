export interface FxRate {
  base: string;        // ISO 4217 source
  quote: string;       // ISO 4217 destination
  rate: number;        // 1 base = `rate` quote
  fetchedAt: Date;
}

export interface FxProvider {
  readonly name: string;
  /** Get the current rate to convert `base` into `quote`. */
  getRate(base: string, quote: string): Promise<FxRate>;
}
