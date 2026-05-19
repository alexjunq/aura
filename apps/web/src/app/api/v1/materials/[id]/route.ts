import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as materials from '@/modules/materials/service';
import { updateMaterialSchema } from '@/modules/materials/schema';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    const row = await materials.get(tenantId, id);
    return NextResponse.json(row);
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    const patch = updateMaterialSchema.parse(await req.json());
    const row = await materials.update(tenantId, id, patch);
    return NextResponse.json(row);
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    await materials.deactivate(tenantId, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
