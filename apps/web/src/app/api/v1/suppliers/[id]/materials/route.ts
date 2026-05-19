import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as suppliers from '@/modules/suppliers/service';
import { linkMaterialSchema } from '@/modules/suppliers/schema';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    const rows = await suppliers.listMaterials(tenantId, id);
    return NextResponse.json({ items: rows });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    const input = linkMaterialSchema.parse(await req.json());
    const row = await suppliers.linkMaterial(tenantId, id, input);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
