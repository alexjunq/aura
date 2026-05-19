import { z } from 'zod';
import { PIECE_STATUSES, type PieceStatus } from '@aura/domain';

// `z.enum` wants a non-empty mutable tuple; PIECE_STATUSES is `readonly`.
// Casting to a mutable tuple is safe — we don't mutate it.
export const pieceStatusSchema = z.enum(
  PIECE_STATUSES as unknown as [PieceStatus, ...PieceStatus[]],
);

export const createPieceSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).nullable().optional(),
    category: z.string().max(80).nullable().optional(),
    currentLocationText: z.string().max(120).nullable().optional(),
  })
  .strict();
export type CreatePieceInput = z.infer<typeof createPieceSchema>;

export const updatePieceSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).nullable(),
    category: z.string().max(80).nullable(),
    currentLocationText: z.string().max(120).nullable(),
  })
  .partial()
  .strict();
export type UpdatePieceInput = z.infer<typeof updatePieceSchema>;

const directTargetStatuses = PIECE_STATUSES.filter(
  (s) => s !== 'sold' && s !== 'returned',
) as Array<Exclude<PieceStatus, 'sold' | 'returned'>>;
export const directStatusTargetSchema = z.enum(
  directTargetStatuses as [string, ...string[]],
);

export const transitionStatusSchema = z
  .object({
    to: directStatusTargetSchema,
    channelId: z.string().min(1).optional(),
  })
  .strict();
export type TransitionStatusInput = z.infer<typeof transitionStatusSchema>;

const decimalString = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .refine((s) => /^\d+(\.\d{1,4})?$/.test(s), 'Must be a non-negative decimal');

export const addMaterialSchema = z
  .object({
    materialId: z.string().min(1),
    quantity: decimalString,
  })
  .strict();
export type AddMaterialInput = z.infer<typeof addMaterialSchema>;

export const recordSessionSchema = z
  .object({
    startedAt: z.coerce.date(),
    endedAt: z.coerce.date(),
    note: z.string().max(2000).nullable().optional(),
  })
  .strict()
  .refine((v) => v.endedAt > v.startedAt, {
    message: 'endedAt must be after startedAt',
    path: ['endedAt'],
  });
export type RecordSessionInput = z.infer<typeof recordSessionSchema>;

export const startSessionSchema = z.object({}).strict();
export const stopSessionSchema = z
  .object({
    note: z.string().max(2000).nullable().optional(),
  })
  .strict()
  .optional()
  .default({});

export const listPiecesQuerySchema = z.object({
  status: pieceStatusSchema.optional(),
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
});
export type ListPiecesQuery = z.infer<typeof listPiecesQuerySchema>;
