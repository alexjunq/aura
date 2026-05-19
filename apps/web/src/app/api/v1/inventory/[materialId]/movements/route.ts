import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as inventory from '@/modules/inventory/service';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ materialId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { materialId } = await params;
    const items = await inventory.listMovements(tenantId, materialId);
    return NextResponse.json({ items });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
