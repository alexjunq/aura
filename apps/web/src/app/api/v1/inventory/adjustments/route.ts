import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as inventory from '@/modules/inventory/service';
import { recordAdjustmentSchema } from '@/modules/inventory/schema';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { tenantId, userId } = await getAuthContext();
    const input = recordAdjustmentSchema.parse(await req.json());
    const row = await inventory.recordAdjustment(tenantId, userId, input);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
