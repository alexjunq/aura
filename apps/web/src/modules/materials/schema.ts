import { z } from 'zod';

export const materialKindSchema = z.enum(['commodity', 'gemstone', 'wood', 'other']);
export type MaterialKindInput = z.infer<typeof materialKindSchema>;

const moneyString = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .refine((s) => /^-?\d+(\.\d{1,8})?$/.test(s), 'Must be a decimal with up to 8 fractional digits');

const currencyCode = z.string().length(3).regex(/^[A-Z]{3}$/);

export const createMaterialSchema = z
  .object({
    name: z.string().min(1).max(120),
    unit: z.string().min(1).max(20),
    kind: materialKindSchema.default('other'),
    commoditySymbol: z.string().min(1).max(20).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .strict()
  .refine(
    (v) => v.kind !== 'commodity' || !!v.commoditySymbol,
    { message: 'commoditySymbol is required when kind=commodity', path: ['commoditySymbol'] },
  );
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;

export const updateMaterialSchema = createMaterialSchema.innerType().partial().strict();
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;

export const priceSourceSchema = z.enum(['manual', 'feed', 'supplier']);

/**
 * Body for `POST /api/v1/materials/:id/prices` — manual entry path.
 * (`feed` and `supplier` enter prices through other code paths.)
 */
export const createManualPriceSchema = z
  .object({
    pricePerUnit: moneyString,
    currency: currencyCode,
    fxRateToBase: moneyString.default('1'),
    effectiveAt: z.coerce.date().default(() => new Date()),
  })
  .strict();
export type CreateManualPriceInput = z.infer<typeof createManualPriceSchema>;

export const createSupplierPriceSchema = z
  .object({
    supplierId: z.string().min(1),
    pricePerUnit: moneyString,
    currency: currencyCode,
    fxRateToBase: moneyString.default('1'),
    effectiveAt: z.coerce.date().default(() => new Date()),
  })
  .strict();
export type CreateSupplierPriceInput = z.infer<typeof createSupplierPriceSchema>;

export const priceQuerySchema = z.object({
  source: priceSourceSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().max(500).default(100),
});
export type PriceQuery = z.infer<typeof priceQuerySchema>;
