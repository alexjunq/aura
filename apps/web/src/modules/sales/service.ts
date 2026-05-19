import { prisma } from '@aura/db';
import { applyPercent, subMoney, validateTransition } from '@aura/domain';
import { errors } from '@/shared/api-errors';
import * as repo from './repo.js';
import type {
  ListSalesQuery,
  PatchSaleInput,
  RecordSaleInput,
} from './schema.js';
import type { SaleRow } from './repo.js';

export type { SaleRow };

/**
 * Record a sale (spec §7 Flow A).
 *
 * Single transaction:
 *   1. Load piece (in this tenant) and assert sellable status (in_studio/
 *      reserved/on_sale).
 *   2. Load channel; snapshot `commissionPct` so later channel edits don't
 *      rewrite history.
 *   3. Compute commission_amount + net_amount.
 *   4. Insert sale row.
 *   5. Validate state-machine transition from piece.status → sold with
 *      origin='sale' and context.saleId.
 *   6. Update piece status to 'sold' + clear currentLocationText.
 *   7. Insert piece_status_history.
 *
 * The partial unique index UNIQUE (pieceId) WHERE refundedAt IS NULL
 * enforces at the DB level that a piece may have at most one active sale
 * at any time.
 */
export async function recordSale(
  tenantId: string,
  userId: string,
  input: RecordSaleInput,
): Promise<SaleRow> {
  return prisma.$transaction(async (tx) => {
    const piece = await tx.piece.findFirst({
      where: { id: input.pieceId, tenantId },
    });
    if (!piece) throw errors.notFound(`piece ${input.pieceId} not found`);

    const buyer = await tx.buyer.findFirst({
      where: { id: input.buyerId, tenantId },
      select: { id: true },
    });
    if (!buyer) throw errors.notFound(`buyer ${input.buyerId} not found`);

    const channel = await tx.salesChannel.findFirst({
      where: { id: input.channelId, tenantId },
      select: { id: true, commissionPct: true },
    });
    if (!channel) throw errors.notFound(`channel ${input.channelId} not found`);

    const commissionPctSnapshot = channel.commissionPct.toString();
    const commissionAmount = applyPercent(input.salePrice, commissionPctSnapshot);
    const netAmount = subMoney(input.salePrice, commissionAmount);

    // Validate state-machine transition BEFORE inserting the sale, so we
    // surface the illegal_transition error code rather than tripping the
    // partial unique index (UNIQUE (pieceId) WHERE refundedAt IS NULL) and
    // surfacing a Prisma error. The saleId placeholder satisfies the
    // saleId-required check; the real id is generated below and copied
    // into piece_status_history.context.
    const preCheck = validateTransition(piece.status, 'sold', 'sale', { saleId: '_pre_' });
    if (!preCheck.ok) {
      throw errors.illegalTransition(preCheck.reason);
    }

    const sale = await tx.sale.create({
      data: {
        tenantId,
        pieceId: input.pieceId,
        buyerId: input.buyerId,
        channelId: input.channelId,
        salePrice: input.salePrice,
        currency: input.currency,
        fxRateToBase: input.fxRateToBase,
        commissionPctSnapshot,
        commissionAmount,
        netAmount,
        soldAt: input.soldAt,
        notes: input.notes ?? null,
      },
    });

    await tx.piece.update({
      where: { id: piece.id },
      data: { status: 'sold', currentLocationText: null },
    });

    await tx.pieceStatusHistory.create({
      data: {
        tenantId,
        pieceId: piece.id,
        fromStatus: piece.status,
        toStatus: 'sold',
        userId,
        context: { saleId: sale.id, channelId: input.channelId } as never,
      },
    });

    return {
      id: sale.id,
      pieceId: sale.pieceId,
      buyerId: sale.buyerId,
      channelId: sale.channelId,
      salePrice: sale.salePrice.toString(),
      currency: sale.currency,
      fxRateToBase: sale.fxRateToBase.toString(),
      commissionPctSnapshot: sale.commissionPctSnapshot.toString(),
      commissionAmount: sale.commissionAmount.toString(),
      netAmount: sale.netAmount.toString(),
      soldAt: sale.soldAt,
      refundedAt: sale.refundedAt,
      notes: sale.notes,
    };
  });
}

/**
 * Refund a sale (spec §7 Flow B). Idempotent: refunding an already-refunded
 * sale is a no-op that returns the existing row.
 */
export async function refund(
  tenantId: string,
  userId: string,
  saleId: string,
): Promise<SaleRow> {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({ where: { id: saleId, tenantId } });
    if (!sale) throw errors.notFound(`sale ${saleId} not found`);
    if (sale.refundedAt) {
      return {
        id: sale.id,
        pieceId: sale.pieceId,
        buyerId: sale.buyerId,
        channelId: sale.channelId,
        salePrice: sale.salePrice.toString(),
        currency: sale.currency,
        fxRateToBase: sale.fxRateToBase.toString(),
        commissionPctSnapshot: sale.commissionPctSnapshot.toString(),
        commissionAmount: sale.commissionAmount.toString(),
        netAmount: sale.netAmount.toString(),
        soldAt: sale.soldAt,
        refundedAt: sale.refundedAt,
        notes: sale.notes,
      };
    }

    const piece = await tx.piece.findFirst({ where: { id: sale.pieceId, tenantId } });
    if (!piece) throw errors.notFound(`piece ${sale.pieceId} not found`);

    const validation = validateTransition(piece.status, 'returned', 'sale', { saleId: sale.id });
    if (!validation.ok) {
      throw errors.illegalTransition(validation.reason);
    }

    const refundedAt = new Date();
    const updated = await tx.sale.update({
      where: { id: saleId },
      data: { refundedAt },
    });
    await tx.piece.update({
      where: { id: piece.id },
      data: { status: 'returned' },
    });
    await tx.pieceStatusHistory.create({
      data: {
        tenantId,
        pieceId: piece.id,
        fromStatus: piece.status,
        toStatus: 'returned',
        userId,
        context: { saleId: sale.id } as never,
      },
    });

    return {
      id: updated.id,
      pieceId: updated.pieceId,
      buyerId: updated.buyerId,
      channelId: updated.channelId,
      salePrice: updated.salePrice.toString(),
      currency: updated.currency,
      fxRateToBase: updated.fxRateToBase.toString(),
      commissionPctSnapshot: updated.commissionPctSnapshot.toString(),
      commissionAmount: updated.commissionAmount.toString(),
      netAmount: updated.netAmount.toString(),
      soldAt: updated.soldAt,
      refundedAt: updated.refundedAt,
      notes: updated.notes,
    };
  });
}

export async function list(tenantId: string, q: ListSalesQuery): Promise<SaleRow[]> {
  return repo.listSales(tenantId, q);
}

export async function listForBuyer(tenantId: string, buyerId: string): Promise<SaleRow[]> {
  return repo.listSalesForBuyer(tenantId, buyerId);
}

export async function get(tenantId: string, id: string): Promise<SaleRow> {
  const r = await repo.getSaleById(tenantId, id);
  if (!r) throw errors.notFound(`sale ${id} not found`);
  return r;
}

export async function patch(
  tenantId: string,
  id: string,
  input: PatchSaleInput,
): Promise<SaleRow> {
  await get(tenantId, id);
  const updated = await prisma.sale.update({
    where: { id },
    data: {
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.soldAt !== undefined ? { soldAt: input.soldAt } : {}),
    },
  });
  return {
    id: updated.id,
    pieceId: updated.pieceId,
    buyerId: updated.buyerId,
    channelId: updated.channelId,
    salePrice: updated.salePrice.toString(),
    currency: updated.currency,
    fxRateToBase: updated.fxRateToBase.toString(),
    commissionPctSnapshot: updated.commissionPctSnapshot.toString(),
    commissionAmount: updated.commissionAmount.toString(),
    netAmount: updated.netAmount.toString(),
    soldAt: updated.soldAt,
    refundedAt: updated.refundedAt,
    notes: updated.notes,
  };
}

