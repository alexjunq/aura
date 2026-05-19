import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as sales from '@/modules/sales/service';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: Params) {
  try {
    const { tenantId, userId } = await getAuthContext();
    const { id } = await params;
    const row = await sales.refund(tenantId, userId, id);
    return NextResponse.json(row);
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
