import { z } from 'zod';

export const channelTypeSchema = z.enum([
  'online',
  'physical_store',
  'event',
  'direct',
  'reseller',
]);

const commissionPct = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .refine(
    (s) => /^(0|[1-9]\d?|100)(\.\d{1,2})?$/.test(s),
    'Must be 0–100 with up to 2 fractional digits',
  );

export const createChannelSchema = z
  .object({
    name: z.string().min(1).max(120),
    type: channelTypeSchema.default('direct'),
    commissionPct: commissionPct.default('0'),
    contactName: z.string().max(120).nullable().optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    address: z.record(z.string(), z.unknown()).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .strict();
export type CreateChannelInput = z.infer<typeof createChannelSchema>;

export const updateChannelSchema = createChannelSchema.partial().strict();
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
