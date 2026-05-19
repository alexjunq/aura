import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as buyers from '@/modules/buyers/service';
import { updateBuyerSchema } from '@/modules/buyers/schema';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    return NextResponse.json(await buyers.get(tenantId, id));
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    const patch = updateBuyerSchema.parse(await req.json());
    return NextResponse.json(await buyers.update(tenantId, id, patch));
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    await buyers.retire(tenantId, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
