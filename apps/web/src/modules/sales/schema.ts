import { z } from 'zod';

const moneyString = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .refine((s) => /^-?\d+(\.\d{1,8})?$/.test(s), 'Must be a decimal');

const currency = z.string().length(3).regex(/^[A-Z]{3}$/);
const isoDate = z.union([z.string(), z.date()]).transform((v) => (typeof v === 'string' ? new Date(v) : v));

export const recordSaleSchema = z
  .object({
    pieceId: z.string().min(1),
    buyerId: z.string().min(1),
    channelId: z.string().min(1),
    salePrice: moneyString,
    currency: currency,
    fxRateToBase: moneyString.default('1'),
    soldAt: isoDate.default(() => new Date()),
    notes: z.string().max(2000).nullable().optional(),
  })
  .strict();
export type RecordSaleInput = z.infer<typeof recordSaleSchema>;

export const patchSaleSchema = z
  .object({
    notes: z.string().max(2000).nullable().optional(),
    soldAt: isoDate.optional(),
  })
  .strict();
export type PatchSaleInput = z.infer<typeof patchSaleSchema>;

export const listSalesQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  channelId: z.string().optional(),
  buyerId: z.string().optional(),
  pieceId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).default(100),
});
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;
