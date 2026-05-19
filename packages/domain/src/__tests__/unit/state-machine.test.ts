import { describe, expect, it } from 'vitest';
import {
  PIECE_STATUSES,
  isLegalTransition,
  validateTransition,
  SELLABLE_STATUSES,
  type PieceStatus,
} from '../../state-machine.js';

// Mirror spec §5 — every cell of the 7x7 transition matrix is asserted below.
const LEGAL: Array<[PieceStatus, PieceStatus]> = [
  ['in_progress', 'in_studio'],
  ['in_progress', 'lost_damaged'],
  ['in_studio', 'reserved'],
  ['in_studio', 'on_sale'],
  ['in_studio', 'sold'],
  ['in_studio', 'lost_damaged'],
  ['reserved', 'in_studio'],
  ['reserved', 'on_sale'],
  ['reserved', 'sold'],
  ['reserved', 'lost_damaged'],
  ['on_sale', 'in_studio'],
  ['on_sale', 'reserved'],
  ['on_sale', 'sold'],
  ['on_sale', 'lost_damaged'],
  ['sold', 'returned'],
  ['returned', 'in_studio'],
  ['returned', 'lost_damaged'],
];

describe('isLegalTransition', () => {
  it('matches the spec matrix exactly — every legal transition is allowed', () => {
    for (const [from, to] of LEGAL) {
      expect(isLegalTransition(from, to)).toBe(true);
    }
  });

  it('every NON-legal cell of the 7x7 matrix is rejected', () => {
    const legalSet = new Set(LEGAL.map(([a, b]) => `${a}|${b}`));
    for (const from of PIECE_STATUSES) {
      for (const to of PIECE_STATUSES) {
        if (from === to) continue;
        const expected = legalSet.has(`${from}|${to}`);
        expect(isLegalTransition(from, to)).toBe(expected);
      }
    }
  });

  it('lost_damaged is terminal', () => {
    for (const to of PIECE_STATUSES) {
      if (to === 'lost_damaged') continue;
      expect(isLegalTransition('lost_damaged', to)).toBe(false);
    }
  });
});

describe('validateTransition — context and origin', () => {
  it('rejects same-status transitions', () => {
    expect(validateTransition('in_studio', 'in_studio', 'direct')).toEqual({
      ok: false,
      reason: expect.stringContaining('same status'),
    });
  });

  it('requires channelId when targeting on_sale', () => {
    expect(validateTransition('in_studio', 'on_sale', 'direct')).toEqual({
      ok: false,
      reason: expect.stringContaining('channelId'),
    });
    expect(
      validateTransition('in_studio', 'on_sale', 'direct', { channelId: 'ch1' }),
    ).toEqual({ ok: true });
  });

  it('requires channelId when targeting reserved', () => {
    expect(validateTransition('in_studio', 'reserved', 'direct')).toEqual({
      ok: false,
      reason: expect.stringContaining('channelId'),
    });
    expect(
      validateTransition('in_studio', 'reserved', 'direct', { channelId: 'ch1' }),
    ).toEqual({ ok: true });
  });

  it('rejects direct transitions to sold and returned', () => {
    expect(
      validateTransition('in_studio', 'sold', 'direct', { saleId: 's1' }),
    ).toEqual({
      ok: false,
      reason: expect.stringContaining('must originate from a sale'),
    });
    expect(
      validateTransition('sold', 'returned', 'direct', { saleId: 's1' }),
    ).toEqual({
      ok: false,
      reason: expect.stringContaining('must originate from a sale'),
    });
  });

  it('allows sale-origin transitions to sold/returned with saleId', () => {
    expect(
      validateTransition('in_studio', 'sold', 'sale', { saleId: 's1' }),
    ).toEqual({ ok: true });
    expect(
      validateTransition('sold', 'returned', 'sale', { saleId: 's1' }),
    ).toEqual({ ok: true });
  });

  it('requires saleId for sold transitions even from sale origin', () => {
    expect(validateTransition('in_studio', 'sold', 'sale')).toEqual({
      ok: false,
      reason: expect.stringContaining('saleId'),
    });
  });
});

describe('SELLABLE_STATUSES', () => {
  it('contains exactly in_studio, reserved, on_sale', () => {
    expect([...SELLABLE_STATUSES].sort()).toEqual(['in_studio', 'on_sale', 'reserved']);
  });
});
