import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as materials from '@/modules/materials/service';
import { createMaterialSchema } from '@/modules/materials/schema';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { tenantId } = await getAuthContext();
    const includeInactive = new URL(req.url).searchParams.get('includeInactive') === 'true';
    const list = await materials.list(tenantId, includeInactive);
    return NextResponse.json({ items: list });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await getAuthContext();
    const input = createMaterialSchema.parse(await req.json());
    const row = await materials.create(tenantId, input);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
