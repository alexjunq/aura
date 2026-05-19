/**
 * Piece status state machine (spec §5).
 *
 * Legal transitions:
 *   in_progress  → in_studio | lost_damaged
 *   in_studio    → reserved | on_sale | sold | lost_damaged
 *   reserved     → in_studio | on_sale | sold | lost_damaged
 *   on_sale      → in_studio | reserved | sold | lost_damaged
 *   sold         → returned                   (only via sales.refund)
 *   returned     → in_studio | lost_damaged
 *   lost_damaged → (terminal)
 *
 * Context requirements:
 *   on_sale / reserved → require `context.channelId`
 *   sold              → produced only by sales.recordSale, requires `context.saleId`
 *   returned          → produced only by sales.refund, requires `context.saleId`
 */

export const PIECE_STATUSES = [
  'in_progress',
  'in_studio',
  'reserved',
  'on_sale',
  'sold',
  'returned',
  'lost_damaged',
] as const;

export type PieceStatus = (typeof PIECE_STATUSES)[number];

export interface TransitionContext {
  channelId?: string;
  saleId?: string;
}

/**
 * Where a transition originates.
 *  - `direct` = invoked via the pieces.transitionStatus service or
 *               the POST /pieces/:id/status route. Must NOT target
 *               `sold` or `returned` — those flow through the sales
 *               module (spec residual #5).
 *  - `sale`   = invoked by sales.recordSale (→ sold) or sales.refund
 *               (→ returned). Allowed targets are `sold` and `returned`
 *               only; requires `saleId` in context.
 */
export type TransitionOrigin = 'direct' | 'sale';

const TRANSITIONS: Record<PieceStatus, PieceStatus[]> = {
  in_progress: ['in_studio', 'lost_damaged'],
  in_studio: ['reserved', 'on_sale', 'sold', 'lost_damaged'],
  reserved: ['in_studio', 'on_sale', 'sold', 'lost_damaged'],
  on_sale: ['in_studio', 'reserved', 'sold', 'lost_damaged'],
  sold: ['returned'],
  returned: ['in_studio', 'lost_damaged'],
  lost_damaged: [],
};

export interface ValidationFailure {
  ok: false;
  reason: string;
}
export interface ValidationSuccess {
  ok: true;
}
export type ValidationResult = ValidationSuccess | ValidationFailure;

export function isLegalTransition(from: PieceStatus, to: PieceStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/**
 * Validate a status transition end-to-end: legal target, context completeness,
 * origin constraints.
 */
export function validateTransition(
  from: PieceStatus,
  to: PieceStatus,
  origin: TransitionOrigin,
  context: TransitionContext = {},
): ValidationResult {
  if (from === to) {
    return { ok: false, reason: `cannot transition to the same status (${from})` };
  }
  if (!isLegalTransition(from, to)) {
    return { ok: false, reason: `illegal transition: ${from} → ${to}` };
  }
  if ((to === 'sold' || to === 'returned') && origin !== 'sale') {
    return {
      ok: false,
      reason: `transition to ${to} must originate from a sale operation`,
    };
  }
  if (to === 'sold' && !context.saleId) {
    return { ok: false, reason: 'sold transition requires context.saleId' };
  }
  if (to === 'returned' && !context.saleId) {
    return { ok: false, reason: 'returned transition requires context.saleId' };
  }
  if ((to === 'on_sale' || to === 'reserved') && !context.channelId) {
    return { ok: false, reason: `${to} transition requires context.channelId` };
  }
  return { ok: true };
}

/**
 * Status set that means "the piece could plausibly be sold from here."
 * sales.recordSale guard uses this.
 */
export const SELLABLE_STATUSES: ReadonlySet<PieceStatus> = new Set([
  'in_studio',
  'reserved',
  'on_sale',
]);

/** Terminal-ish state: lost_damaged cannot transition further (write-off). */
export const TERMINAL_STATUSES: ReadonlySet<PieceStatus> = new Set(['lost_damaged']);
