import { z } from 'zod';

export const buyerInteractionKindSchema = z.enum(['meeting', 'message', 'inquiry', 'note', 'other']);
export type BuyerInteractionKindInput = z.infer<typeof buyerInteractionKindSchema>;

const isoDate = z.union([z.string(), z.date()]).transform((v) => (typeof v === 'string' ? new Date(v) : v));

export const createBuyerSchema = z
  .object({
    name: z.string().min(1).max(120),
    email: z.string().email().nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    instagram: z.string().max(80).nullable().optional(),
    birthdate: isoDate.nullable().optional(),
    address: z.record(z.string(), z.unknown()).nullable().optional(),
    interests: z.array(z.string().min(1).max(40)).max(50).default([]),
    notes: z.string().max(5000).nullable().optional(),
  })
  .strict();
export type CreateBuyerInput = z.infer<typeof createBuyerSchema>;

export const updateBuyerSchema = createBuyerSchema.partial().strict();
export type UpdateBuyerInput = z.infer<typeof updateBuyerSchema>;

export const createInteractionSchema = z
  .object({
    occurredAt: isoDate,
    kind: buyerInteractionKindSchema.default('note'),
    summary: z.string().min(1).max(2000),
  })
  .strict();
export type CreateInteractionInput = z.infer<typeof createInteractionSchema>;

export const listBuyersQuerySchema = z.object({
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
});
