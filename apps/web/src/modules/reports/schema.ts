import { z } from 'zod';

const isoDate = z.union([z.string(), z.date()]).transform((v) => (typeof v === 'string' ? new Date(v) : v));

export const revenueGroupBySchema = z.enum(['month', 'channel', 'buyer', 'category']);
export type RevenueGroupBy = z.infer<typeof revenueGroupBySchema>;

export const inventoryGroupBySchema = z.enum(['status', 'category']);
export type InventoryGroupBy = z.infer<typeof inventoryGroupBySchema>;

export const revenueQuerySchema = z.object({
  groupBy: revenueGroupBySchema.default('month'),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type RevenueQuery = z.infer<typeof revenueQuerySchema>;

export const inventoryQuerySchema = z.object({
  groupBy: inventoryGroupBySchema.default('status'),
});
export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;

export const marginQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type MarginQuery = z.infer<typeof marginQuerySchema>;
