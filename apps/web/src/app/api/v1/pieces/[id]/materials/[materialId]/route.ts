import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as pieces from '@/modules/pieces/service';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string; materialId: string }>;
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id, materialId } = await params;
    await pieces.removeMaterial(tenantId, id, materialId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
