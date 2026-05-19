import {
  type PieceStatus,
  type TransitionOrigin,
  validateTransition,
  slugify,
  dedupeSlug,
  toBase,
  mulMoney,
  addMoney,
} from '@aura/domain';
import { errors } from '@/shared/api-errors';
import * as repo from './repo.js';
import * as materials from '@/modules/materials/service';
import type {
  AddMaterialInput,
  CreatePieceInput,
  RecordSessionInput,
  TransitionStatusInput,
  UpdatePieceInput,
} from './schema.js';
import type {
  PieceMaterialRow,
  PieceRow,
  StatusHistoryRow,
  WorkSessionRow,
} from './repo.js';

export type { PieceRow, PieceMaterialRow, WorkSessionRow, StatusHistoryRow };

/**
 * Pieces service. Owns:
 *   - slug auto-gen and dedupe (spec residual #4)
 *   - state-machine validation (rejects sold/returned for direct transitions —
 *     spec residual #5)
 *   - material snapshot at add-time: current price → base currency → frozen
 *     into `piece_material.captured_price_per_unit`
 *   - work-session lifecycle, including the active-timer guard (one open
 *     session per tenant at a time)
 */

export async function list(
  tenantId: string,
  query: { status?: PieceStatus; q?: string; limit?: number },
): Promise<PieceRow[]> {
  return repo.listPieces(tenantId, query);
}

export async function get(tenantId: string, id: string): Promise<PieceRow> {
  const row = await repo.getPieceById(tenantId, id);
  if (!row) throw errors.notFound(`piece ${id} not found`);
  return row;
}

export async function create(tenantId: string, input: CreatePieceInput): Promise<PieceRow> {
  const base = slugify(input.title);
  const taken = await repo.listSlugsStartingWith(tenantId, base);
  const slug = dedupeSlug(base, taken);
  return repo.createPiece(tenantId, { ...input, slug });
}

export async function update(
  tenantId: string,
  id: string,
  patch: UpdatePieceInput,
): Promise<PieceRow> {
  const updated = await repo.updatePiece(tenantId, id, patch);
  if (!updated) throw errors.notFound(`piece ${id} not found`);
  return updated;
}

export interface TransitionStatusContext {
  channelId?: string;
  saleId?: string;
}

/**
 * Direct status transition. Disallows targets `sold` and `returned` —
 * those flow through sales.recordSale and sales.refund respectively.
 *
 * The `origin` parameter exists so the sales module can call this same
 * function with `origin='sale'` to transition to `sold`/`returned`.
 * Direct callers (route handlers, server actions) leave it as `'direct'`.
 */
export async function transitionStatus(
  tenantId: string,
  userId: string,
  pieceId: string,
  args: { to: PieceStatus; context?: TransitionStatusContext },
  origin: TransitionOrigin = 'direct',
): Promise<PieceRow> {
  const current = await repo.getPieceById(tenantId, pieceId);
  if (!current) throw errors.notFound(`piece ${pieceId} not found`);

  const validation = validateTransition(current.status, args.to, origin, args.context ?? {});
  if (!validation.ok) {
    throw errors.illegalTransition(validation.reason);
  }

  const updated = await repo.applyStatusTransition(tenantId, pieceId, {
    to: args.to,
    userId,
    context: (args.context ?? {}) as Record<string, unknown>,
  });
  if (!updated) throw errors.notFound(`piece ${pieceId} not found`);
  return updated;
}

/**
 * Route-handler entry for status transitions. Schema guarantees `to` is
 * not `sold`/`returned`; this just wraps `transitionStatus` with channel
 * context.
 */
export async function transitionStatusFromRoute(
  tenantId: string,
  userId: string,
  pieceId: string,
  input: TransitionStatusInput,
): Promise<PieceRow> {
  return transitionStatus(
    tenantId,
    userId,
    pieceId,
    {
      to: input.to as PieceStatus,
      context: input.channelId ? { channelId: input.channelId } : {},
    },
    'direct',
  );
}

// --- Materials ---

export async function listMaterials(
  tenantId: string,
  pieceId: string,
): Promise<PieceMaterialRow[]> {
  await get(tenantId, pieceId);
  return repo.listPieceMaterials(tenantId, pieceId);
}

/**
 * Add a material to a piece. Snapshots the *current* price into base
 * currency at the moment of adding — so future price changes don't
 * rewrite this piece's historical cost (spec §7 Flow C).
 *
 * Disallowed unless the piece is `in_progress`.
 */
export async function addMaterial(
  tenantId: string,
  pieceId: string,
  input: AddMaterialInput,
): Promise<PieceMaterialRow> {
  const piece = await get(tenantId, pieceId);
  if (piece.status !== 'in_progress') {
    throw errors.illegalTransition(
      `materials may only be added while a piece is in_progress (current: ${piece.status})`,
    );
  }
  // Resolve current price for the material. Prefer the most recent across
  // any source — newest effectiveAt wins.
  const current = await materials.currentPrices(tenantId, input.materialId);
  if (current.length === 0) {
    throw errors.conflict(
      `no price recorded yet for material ${input.materialId}; add a price first`,
    );
  }
  const newest = current.reduce((a, b) =>
    a.effectiveAt > b.effectiveAt ? a : b,
  );
  const priceInBase = toBase(newest.pricePerUnit, newest.fxRateToBase);

  const row = await repo.addPieceMaterial(
    tenantId,
    pieceId,
    input.materialId,
    input.quantity,
    priceInBase,
  );
  if (!row) throw errors.notFound('material not found in tenant');
  return row;
}

export async function removeMaterial(
  tenantId: string,
  pieceId: string,
  materialId: string,
): Promise<void> {
  const piece = await get(tenantId, pieceId);
  if (piece.status !== 'in_progress') {
    throw errors.illegalTransition(
      `materials may only be removed while a piece is in_progress (current: ${piece.status})`,
    );
  }
  const ok = await repo.removePieceMaterial(tenantId, pieceId, materialId);
  if (!ok) throw errors.notFound('piece-material link not found');
}

/**
 * Running total cost of a piece's materials in base currency. Used by the
 * detail page now and by the Phase 6 cost-breakdown view.
 */
export async function materialsCostBase(
  tenantId: string,
  pieceId: string,
): Promise<string> {
  const rows = await repo.listPieceMaterials(tenantId, pieceId);
  let total = '0';
  for (const r of rows) {
    total = addMoney(total, mulMoney(r.capturedPricePerUnit, r.quantity));
  }
  return total;
}

// --- Work sessions ---

export async function listSessions(
  tenantId: string,
  pieceId: string,
): Promise<WorkSessionRow[]> {
  await get(tenantId, pieceId);
  return repo.listSessions(tenantId, pieceId);
}

export async function activeSession(tenantId: string): Promise<WorkSessionRow | null> {
  return repo.findActiveSession(tenantId);
}

export async function startSession(
  tenantId: string,
  pieceId: string,
): Promise<WorkSessionRow> {
  await get(tenantId, pieceId);
  const open = await repo.findActiveSession(tenantId);
  if (open) {
    throw errors.conflict(
      `another timer is already running on piece ${open.pieceId}`,
    );
  }
  const row = await repo.startSession(tenantId, pieceId);
  if (!row) throw errors.notFound(`piece ${pieceId} not found`);
  return row;
}

export async function stopSession(
  tenantId: string,
  sessionId: string,
  note: string | null,
): Promise<WorkSessionRow> {
  const row = await repo.stopSession(tenantId, sessionId, note);
  if (!row) throw errors.notFound(`session ${sessionId} not found`);
  return row;
}

export async function recordSession(
  tenantId: string,
  pieceId: string,
  input: RecordSessionInput,
): Promise<WorkSessionRow> {
  await get(tenantId, pieceId);
  const row = await repo.recordSession(tenantId, pieceId, {
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    note: input.note ?? null,
  });
  if (!row) throw errors.notFound(`piece ${pieceId} not found`);
  return row;
}

export async function totalSessionSeconds(
  tenantId: string,
  pieceId: string,
): Promise<number> {
  return repo.totalSessionSeconds(tenantId, pieceId);
}

// --- Status history ---

export async function statusHistory(
  tenantId: string,
  pieceId: string,
): Promise<StatusHistoryRow[]> {
  await get(tenantId, pieceId);
  return repo.listStatusHistory(tenantId, pieceId);
}

// --- Photo ---

export async function setPrimaryPhotoKey(
  tenantId: string,
  pieceId: string,
  key: string | null,
): Promise<void> {
  const ok = await repo.setPrimaryPhotoKey(tenantId, pieceId, key);
  if (!ok) throw errors.notFound(`piece ${pieceId} not found`);
}
