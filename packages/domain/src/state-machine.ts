/**
 * Piece status state machine (spec §5).
 *
 * This file is the v0 stub: types only. Phase 3 wires the full transition
 * matrix and context requirements (channel_id for on_sale/reserved,
 * sale_id for sold).
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

export interface TransitionResult {
  ok: boolean;
  reason?: string;
}

// Phase 3 will replace this with the real transition matrix + context checks.
export function isLegalTransition(_from: PieceStatus, _to: PieceStatus): boolean {
  throw new Error('isLegalTransition not yet implemented — wires up in Phase 3');
}
