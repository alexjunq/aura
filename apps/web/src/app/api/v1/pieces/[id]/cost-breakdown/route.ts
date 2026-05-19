import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as pricing from '@/modules/pricing/service';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    return NextResponse.json(await pricing.breakdown(tenantId, id));
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
