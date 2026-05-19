import { z } from 'zod';

const positiveDecimal = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .refine(
    (s) => /^\d+(\.\d{1,4})?$/.test(s) && Number(s) > 0,
    'Must be a positive decimal with up to 4 fractional digits',
  );

const signedDecimal = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .refine(
    (s) => /^-?\d+(\.\d{1,4})?$/.test(s) && Number(s) !== 0,
    'Must be a non-zero decimal with up to 4 fractional digits',
  );

const currency = z.string().length(3).regex(/^[A-Z]{3}$/);
const isoDate = z
  .union([z.string(), z.date()])
  .transform((v) => (typeof v === 'string' ? new Date(v) : v));

export const recordPurchaseSchema = z
  .object({
    materialId: z.string().min(1),
    supplierId: z.string().min(1),
    quantity: positiveDecimal,
    unitCost: positiveDecimal,
    currency,
    fxRateToBase: positiveDecimal.default('1'),
    occurredAt: isoDate.default(() => new Date()),
    reference: z.string().max(200).nullable().optional(),
  })
  .strict();
export type RecordPurchaseInput = z.infer<typeof recordPurchaseSchema>;

export const recordAdjustmentSchema = z
  .object({
    materialId: z.string().min(1),
    /// Signed: positive to write-up, negative to write-down.
    quantity: signedDecimal,
    reference: z.string().min(1).max(200),
    occurredAt: isoDate.default(() => new Date()),
  })
  .strict();
export type RecordAdjustmentInput = z.infer<typeof recordAdjustmentSchema>;
