import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as materials from '@/modules/materials/service';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

const moneyString = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .refine((s) => /^-?\d+(\.\d{1,8})?$/.test(s), 'Must be a decimal');

const recordSupplierPriceSchema = z
  .object({
    materialId: z.string().min(1),
    pricePerUnit: moneyString,
    currency: z.string().length(3),
    fxRateToBase: moneyString.default('1'),
    effectiveAt: z.coerce.date().default(() => new Date()),
  })
  .strict();

/**
 * POST /api/v1/suppliers/:id/prices — record a price-per-material observation
 * attributed to this supplier. Writes a `material_price` row with
 * `source='supplier'` and `supplierId=:id`. See spec §6.4.
 */
export async function POST(req: Request, { params }: Params) {
  try {
    const { tenantId, userId } = await getAuthContext();
    const { id: supplierId } = await params;
    const input = recordSupplierPriceSchema.parse(await req.json());
    const row = await materials.recordSupplierPrice(tenantId, input.materialId, userId, {
      supplierId,
      pricePerUnit: input.pricePerUnit,
      currency: input.currency,
      fxRateToBase: input.fxRateToBase,
      effectiveAt: input.effectiveAt,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
