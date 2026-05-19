import { z } from 'zod';

export const createSupplierSchema = z
  .object({
    name: z.string().min(1).max(120),
    contactName: z.string().max(120).nullable().optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    website: z.string().url().nullable().optional(),
    address: z.record(z.string(), z.unknown()).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .strict();
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial().strict();
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const linkMaterialSchema = z
  .object({
    materialId: z.string().min(1),
    sku: z.string().max(80).nullable().optional(),
    defaultLeadTimeDays: z.number().int().min(0).max(3650).nullable().optional(),
  })
  .strict();
export type LinkMaterialInput = z.infer<typeof linkMaterialSchema>;
