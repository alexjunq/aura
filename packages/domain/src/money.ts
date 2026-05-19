/**
 * Money helpers.
 *
 * All amounts are decimal strings on the wire (never float).
 * Internally we represent amounts as `bigint` of the smallest scale unit
 * (4 fractional digits, matching the DB column `decimal(14, 4)`).
 *
 * The scale of 4 is enough for both currency cents AND for capturing
 * fractional rates (FX, commission) without losing precision.
 */

export const MONEY_SCALE = 4;
export const MONEY_SCALE_FACTOR = 10_000n; // 10^MONEY_SCALE

export type MoneyString = string; // e.g. "1234.5600"

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

/// Parse a money string to scaled bigint. Tolerates `"1234"`, `"1234.5"`,
/// `"1234.5600"`, and negative values. Rejects scientific notation, NaN,
/// and more than 4 fractional digits.
export function parseMoney(s: MoneyString | number): bigint {
  const raw = typeof s === 'number' ? s.toString() : s;
  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    throw new MoneyError(`Invalid money string: ${JSON.stringify(s)}`);
  }
  const negative = raw.startsWith('-');
  const body = negative ? raw.slice(1) : raw;
  const [intPart, fracPartRaw = ''] = body.split('.');
  if (fracPartRaw.length > MONEY_SCALE) {
    throw new MoneyError(
      `Money string has more than ${MONEY_SCALE} fractional digits: ${raw}`,
    );
  }
  const fracPart = fracPartRaw.padEnd(MONEY_SCALE, '0');
  const scaled = BigInt((intPart ?? '0') + fracPart);
  return negative ? -scaled : scaled;
}

/// Format a scaled bigint back to a money string with full 4-digit scale.
export function formatMoney(scaled: bigint): MoneyString {
  const negative = scaled < 0n;
  const abs = negative ? -scaled : scaled;
  const intPart = abs / MONEY_SCALE_FACTOR;
  const fracPart = (abs % MONEY_SCALE_FACTOR).toString().padStart(MONEY_SCALE, '0');
  return `${negative ? '-' : ''}${intPart}.${fracPart}`;
}

/// Add two money strings, returning a money string.
export function addMoney(a: MoneyString, b: MoneyString): MoneyString {
  return formatMoney(parseMoney(a) + parseMoney(b));
}

/// Subtract `b` from `a`.
export function subMoney(a: MoneyString, b: MoneyString): MoneyString {
  return formatMoney(parseMoney(a) - parseMoney(b));
}

/// Multiply money by a unitless scalar (also expressed as a 4-scale decimal).
/// Result is rounded half-to-even to avoid bias.
export function mulMoney(amount: MoneyString, factor: MoneyString | number): MoneyString {
  const scaledAmount = parseMoney(amount);
  const scaledFactor = parseMoney(typeof factor === 'number' ? factor.toString() : factor);
  // (scaledAmount * scaledFactor) has scale 2*MONEY_SCALE; divide by MONEY_SCALE_FACTOR.
  const product = scaledAmount * scaledFactor;
  const quotient = product / MONEY_SCALE_FACTOR;
  const remainder = product % MONEY_SCALE_FACTOR;
  // Banker's rounding (round half to even).
  const half = MONEY_SCALE_FACTOR / 2n;
  let rounded = quotient;
  if (remainder > half || (remainder === half && quotient % 2n !== 0n)) {
    rounded += 1n;
  } else if (remainder < -half || (remainder === -half && quotient % 2n !== 0n)) {
    rounded -= 1n;
  }
  return formatMoney(rounded);
}

/// Convert an amount from `currency` to `baseCurrency` using a captured FX rate.
/// `fxRateToBase` is "1 unit of currency = X units of baseCurrency."
export function toBase(amount: MoneyString, fxRateToBase: MoneyString | number): MoneyString {
  return mulMoney(amount, fxRateToBase);
}

/// Compute `amount * pct / 100`. `pct` is e.g. "12.5" for 12.5%.
export function applyPercent(amount: MoneyString, pct: MoneyString | number): MoneyString {
  const factor = mulMoney(typeof pct === 'number' ? pct.toString() : pct, '0.01');
  return mulMoney(amount, factor);
}

/**
 * Convert seconds → hours as a money-compatible decimal string (≤ 4 fractional
 * digits). Plain `(sec / 3600).toString()` yields floats like
 * `0.0019444444444444444` that `parseMoney` rejects; this rounds to MONEY_SCALE
 * up front so the result is always safe to pass to `mulMoney`.
 */
export function secondsToHours(sec: number): MoneyString {
  const hours = sec / 3600;
  const scaled = Math.round(hours * Number(MONEY_SCALE_FACTOR)) / Number(MONEY_SCALE_FACTOR);
  return scaled.toString();
}
