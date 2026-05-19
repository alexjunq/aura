import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as buyers from '@/modules/buyers/service';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string; iid: string }>;
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id, iid } = await params;
    await buyers.deleteInteraction(tenantId, id, iid);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
