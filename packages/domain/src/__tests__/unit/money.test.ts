import { describe, expect, it } from 'vitest';
import {
  addMoney,
  applyPercent,
  formatMoney,
  mulMoney,
  parseMoney,
  secondsToHours,
  subMoney,
  toBase,
} from '../../money.js';

describe('parseMoney / formatMoney', () => {
  it('round-trips integer values', () => {
    expect(formatMoney(parseMoney('1234'))).toBe('1234.0000');
  });

  it('round-trips fractional values', () => {
    expect(formatMoney(parseMoney('1.23'))).toBe('1.2300');
    expect(formatMoney(parseMoney('1.2345'))).toBe('1.2345');
  });

  it('handles negative values', () => {
    expect(formatMoney(parseMoney('-50.5'))).toBe('-50.5000');
  });

  it('rejects more than 4 fractional digits', () => {
    expect(() => parseMoney('1.23456')).toThrow();
  });

  it('rejects non-numeric input', () => {
    expect(() => parseMoney('abc')).toThrow();
    expect(() => parseMoney('1e5')).toThrow();
  });
});

describe('addMoney / subMoney', () => {
  it('adds correctly', () => {
    expect(addMoney('1.50', '0.25')).toBe('1.7500');
  });

  it('subtracts correctly', () => {
    expect(subMoney('1.50', '0.25')).toBe('1.2500');
  });

  it('handles negatives', () => {
    expect(addMoney('-1.50', '0.25')).toBe('-1.2500');
  });
});

describe('mulMoney', () => {
  it('multiplies by integer', () => {
    expect(mulMoney('1.50', '2')).toBe('3.0000');
  });

  it('multiplies by fraction', () => {
    expect(mulMoney('10.00', '0.5')).toBe('5.0000');
  });

  it('rounds half to even', () => {
    // 0.12345 → 0.1234 (rounds to even)
    expect(mulMoney('1.2345', '0.1')).toBe('0.1234');
  });
});

describe('toBase', () => {
  it('multiplies by FX rate', () => {
    expect(toBase('100.00', '1.0823')).toBe('108.2300');
  });
});

describe('applyPercent', () => {
  it('computes 12.5% of 100', () => {
    expect(applyPercent('100.00', '12.5')).toBe('12.5000');
  });

  it('computes 0% of any amount', () => {
    expect(applyPercent('1234.56', '0')).toBe('0.0000');
  });
});

describe('secondsToHours', () => {
  it('rounds 7 seconds to 4dp so parseMoney accepts the result', () => {
    // The bug that motivated this helper: 7 / 3600 = 0.0019444444444444444
    // (way more than 4 fractional digits) → parseMoney rejects it.
    expect(secondsToHours(7)).toBe('0.0019');
    expect(() => parseMoney(secondsToHours(7))).not.toThrow();
  });

  it('returns 0 for 0 seconds', () => {
    expect(secondsToHours(0)).toBe('0');
  });

  it('returns 1 for a full hour', () => {
    expect(secondsToHours(3600)).toBe('1');
  });

  it('handles fractional hours cleanly', () => {
    // 30 minutes = 0.5 h.
    expect(secondsToHours(1800)).toBe('0.5');
  });
});
