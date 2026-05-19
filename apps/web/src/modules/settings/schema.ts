import { z } from 'zod';

/// ISO 4217 currency code. Loose validation; the DB column is text.
export const currencyCodeSchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/, 'Must be a 3-letter uppercase code (e.g. USD, EUR, BRL)');

export const hourlyRateSchema = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .refine((s) => /^\d+(\.\d{1,4})?$/.test(s), 'Must be a non-negative decimal with up to 4 fractional digits');

export const tenantSettingsSchema = z.object({
  baseCurrency: currencyCodeSchema,
  hourlyLaborRate: hourlyRateSchema,
  studioName: z.string().min(1).max(120),
});
export type TenantSettings = z.infer<typeof tenantSettingsSchema>;

export const updateSettingsSchema = tenantSettingsSchema.partial().strict();
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
