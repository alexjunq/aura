import { prisma } from '@aura/db';
import type { PieceStatus } from '@aura/domain';
import type { Prisma } from '@aura/db';

export interface PieceRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  status: PieceStatus;
  currentLocationText: string | null;
  primaryPhotoKey: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PieceMaterialRow {
  pieceId: string;
  materialId: string;
  materialName: string;
  materialUnit: string;
  quantity: string;
  capturedPricePerUnit: string;
  capturedAt: Date;
}

export interface WorkSessionRow {
  id: string;
  pieceId: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  note: string | null;
}

export interface StatusHistoryRow {
  id: string;
  pieceId: string;
  fromStatus: PieceStatus;
  toStatus: PieceStatus;
  changedAt: Date;
  userId: string | null;
  context: Record<string, unknown> | null;
}

function toPiece(r: {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  status: PieceStatus;
  currentLocationText: string | null;
  primaryPhotoKey: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PieceRow {
  return r;
}

export async function listPieces(
  tenantId: string,
  opts: { status?: PieceStatus; q?: string; limit?: number },
): Promise<PieceRow[]> {
  const rows = await prisma.piece.findMany({
    where: {
      tenantId,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.q
        ? {
            OR: [
              { title: { contains: opts.q, mode: 'insensitive' } },
              { category: { contains: opts.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: opts.limit ?? 50,
  });
  return rows.map(toPiece);
}

export async function getPieceById(tenantId: string, id: string): Promise<PieceRow | null> {
  const row = await prisma.piece.findFirst({ where: { id, tenantId } });
  return row ? toPiece(row) : null;
}

export async function getPieceBySlug(tenantId: string, slug: string): Promise<PieceRow | null> {
  const row = await prisma.piece.findFirst({ where: { slug, tenantId } });
  return row ? toPiece(row) : null;
}

export async function listSlugsStartingWith(
  tenantId: string,
  base: string,
): Promise<string[]> {
  const rows = await prisma.piece.findMany({
    where: {
      tenantId,
      OR: [{ slug: base }, { slug: { startsWith: `${base}-` } }],
    },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

export async function createPiece(
  tenantId: string,
  data: {
    title: string;
    slug: string;
    description?: string | null;
    category?: string | null;
    currentLocationText?: string | null;
  },
): Promise<PieceRow> {
  const row = await prisma.piece.create({
    data: {
      tenantId,
      title: data.title,
      slug: data.slug,
      description: data.description ?? null,
      category: data.category ?? null,
      currentLocationText: data.currentLocationText ?? null,
      status: 'in_progress',
      startedAt: new Date(),
    },
  });
  return toPiece(row);
}

export async function updatePiece(
  tenantId: string,
  id: string,
  patch: Partial<{
    title: string;
    description: string | null;
    category: string | null;
    currentLocationText: string | null;
  }>,
): Promise<PieceRow | null> {
  const result = await prisma.piece.updateMany({
    where: { id, tenantId },
    data: patch,
  });
  if (result.count === 0) return null;
  return getPieceById(tenantId, id);
}

export async function setPrimaryPhotoKey(
  tenantId: string,
  id: string,
  key: string | null,
): Promise<boolean> {
  const r = await prisma.piece.updateMany({
    where: { id, tenantId },
    data: { primaryPhotoKey: key },
  });
  return r.count > 0;
}

/**
 * Apply a status transition + write a piece_status_history row in one
 * transaction. Returns the updated piece, or null if the piece doesn't
 * belong to the tenant.
 */
export async function applyStatusTransition(
  tenantId: string,
  id: string,
  args: {
    to: PieceStatus;
    userId: string | null;
    context: Record<string, unknown>;
    finishedAt?: Date | null;
  },
): Promise<PieceRow | null> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.piece.findFirst({ where: { id, tenantId } });
    if (!current) return null;
    const finishedPatch: Prisma.PieceUpdateInput = {};
    if (args.finishedAt !== undefined) {
      finishedPatch.finishedAt = args.finishedAt;
    } else if (args.to === 'in_studio' && !current.finishedAt) {
      // First time leaving in_progress: stamp finishedAt.
      finishedPatch.finishedAt = new Date();
    }
    await tx.piece.update({
      where: { id },
      data: { status: args.to, ...finishedPatch },
    });
    await tx.pieceStatusHistory.create({
      data: {
        tenantId,
        pieceId: id,
        fromStatus: current.status,
        toStatus: args.to,
        userId: args.userId,
        context: args.context as never,
      },
    });
    const updated = await tx.piece.findUnique({ where: { id } });
    return updated ? toPiece(updated) : null;
  });
}

// --- Materials on a piece ---

export async function listPieceMaterials(
  tenantId: string,
  pieceId: string,
): Promise<PieceMaterialRow[]> {
  const piece = await prisma.piece.findFirst({
    where: { id: pieceId, tenantId },
    select: {
      materials: {
        include: { material: { select: { name: true, unit: true } } },
        orderBy: { capturedAt: 'desc' },
      },
    },
  });
  if (!piece) return [];
  return piece.materials.map((pm) => ({
    pieceId: pieceId,
    materialId: pm.materialId,
    materialName: pm.material.name,
    materialUnit: pm.material.unit,
    quantity: pm.quantity.toString(),
    capturedPricePerUnit: pm.capturedPricePerUnit.toString(),
    capturedAt: pm.capturedAt,
  }));
}

export async function addPieceMaterial(
  tenantId: string,
  pieceId: string,
  materialId: string,
  quantity: string,
  capturedPricePerUnitBase: string,
): Promise<PieceMaterialRow | null> {
  const [piece, material] = await Promise.all([
    prisma.piece.findFirst({ where: { id: pieceId, tenantId }, select: { id: true } }),
    prisma.material.findFirst({
      where: { id: materialId, tenantId },
      select: { id: true, name: true, unit: true },
    }),
  ]);
  if (!piece || !material) return null;

  const row = await prisma.pieceMaterial.upsert({
    where: { pieceId_materialId: { pieceId, materialId } },
    create: {
      pieceId,
      materialId,
      quantity,
      capturedPricePerUnit: capturedPricePerUnitBase,
    },
    update: {
      quantity,
      capturedPricePerUnit: capturedPricePerUnitBase,
      capturedAt: new Date(),
    },
  });

  return {
    pieceId,
    materialId,
    materialName: material.name,
    materialUnit: material.unit,
    quantity: row.quantity.toString(),
    capturedPricePerUnit: row.capturedPricePerUnit.toString(),
    capturedAt: row.capturedAt,
  };
}

export async function removePieceMaterial(
  tenantId: string,
  pieceId: string,
  materialId: string,
): Promise<boolean> {
  const piece = await prisma.piece.findFirst({
    where: { id: pieceId, tenantId },
    select: { id: true },
  });
  if (!piece) return false;
  const r = await prisma.pieceMaterial.deleteMany({
    where: { pieceId, materialId },
  });
  return r.count > 0;
}

// --- Work sessions ---

export async function findActiveSession(
  tenantId: string,
): Promise<WorkSessionRow | null> {
  const row = await prisma.workSession.findFirst({
    where: { tenantId, endedAt: null },
  });
  return row
    ? {
        id: row.id,
        pieceId: row.pieceId,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        durationSeconds: row.durationSeconds,
        note: row.note,
      }
    : null;
}

export async function startSession(
  tenantId: string,
  pieceId: string,
): Promise<WorkSessionRow | null> {
  const piece = await prisma.piece.findFirst({
    where: { id: pieceId, tenantId },
    select: { id: true },
  });
  if (!piece) return null;
  const row = await prisma.workSession.create({
    data: {
      tenantId,
      pieceId,
      startedAt: new Date(),
    },
  });
  return {
    id: row.id,
    pieceId: row.pieceId,
    startedAt: row.startedAt,
    endedAt: null,
    durationSeconds: null,
    note: null,
  };
}

export async function stopSession(
  tenantId: string,
  sessionId: string,
  note: string | null,
): Promise<WorkSessionRow | null> {
  const session = await prisma.workSession.findFirst({
    where: { id: sessionId, tenantId },
  });
  if (!session) return null;
  if (session.endedAt) {
    // Idempotent: already stopped.
    return {
      id: session.id,
      pieceId: session.pieceId,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationSeconds: session.durationSeconds,
      note: session.note,
    };
  }
  const endedAt = new Date();
  const durationSeconds = Math.max(
    0,
    Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000),
  );
  const updated = await prisma.workSession.update({
    where: { id: sessionId },
    data: { endedAt, durationSeconds, note: note ?? session.note },
  });
  return {
    id: updated.id,
    pieceId: updated.pieceId,
    startedAt: updated.startedAt,
    endedAt: updated.endedAt,
    durationSeconds: updated.durationSeconds,
    note: updated.note,
  };
}

export async function recordSession(
  tenantId: string,
  pieceId: string,
  args: { startedAt: Date; endedAt: Date; note: string | null },
): Promise<WorkSessionRow | null> {
  const piece = await prisma.piece.findFirst({
    where: { id: pieceId, tenantId },
    select: { id: true },
  });
  if (!piece) return null;
  const durationSeconds = Math.max(
    0,
    Math.floor((args.endedAt.getTime() - args.startedAt.getTime()) / 1000),
  );
  const row = await prisma.workSession.create({
    data: {
      tenantId,
      pieceId,
      startedAt: args.startedAt,
      endedAt: args.endedAt,
      durationSeconds,
      note: args.note,
    },
  });
  return {
    id: row.id,
    pieceId: row.pieceId,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    durationSeconds: row.durationSeconds,
    note: row.note,
  };
}

export async function listSessions(
  tenantId: string,
  pieceId: string,
): Promise<WorkSessionRow[]> {
  const rows = await prisma.workSession.findMany({
    where: { tenantId, pieceId },
    orderBy: { startedAt: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    pieceId: r.pieceId,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    durationSeconds: r.durationSeconds,
    note: r.note,
  }));
}

export async function totalSessionSeconds(
  tenantId: string,
  pieceId: string,
): Promise<number> {
  const agg = await prisma.workSession.aggregate({
    where: { tenantId, pieceId, endedAt: { not: null } },
    _sum: { durationSeconds: true },
  });
  return agg._sum.durationSeconds ?? 0;
}

// --- Status history ---

export async function listStatusHistory(
  tenantId: string,
  pieceId: string,
): Promise<StatusHistoryRow[]> {
  const rows = await prisma.pieceStatusHistory.findMany({
    where: { tenantId, pieceId },
    orderBy: { changedAt: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    pieceId: r.pieceId,
    fromStatus: r.fromStatus,
    toStatus: r.toStatus,
    changedAt: r.changedAt,
    userId: r.userId,
    context: (r.context ?? null) as Record<string, unknown> | null,
  }));
}
