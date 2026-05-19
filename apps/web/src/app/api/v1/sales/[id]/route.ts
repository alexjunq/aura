import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as sales from '@/modules/sales/service';
import { patchSaleSchema } from '@/modules/sales/schema';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    return NextResponse.json(await sales.get(tenantId, id));
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    const input = patchSaleSchema.parse(await req.json());
    return NextResponse.json(await sales.patch(tenantId, id, input));
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
