import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as suppliers from '@/modules/suppliers/service';
import { updateSupplierSchema } from '@/modules/suppliers/schema';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    const row = await suppliers.get(tenantId, id);
    return NextResponse.json(row);
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    const patch = updateSupplierSchema.parse(await req.json());
    const row = await suppliers.update(tenantId, id, patch);
    return NextResponse.json(row);
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    await suppliers.deactivate(tenantId, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
