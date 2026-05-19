import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as suppliers from '@/modules/suppliers/service';
import { createSupplierSchema } from '@/modules/suppliers/schema';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { tenantId } = await getAuthContext();
    const includeInactive = new URL(req.url).searchParams.get('includeInactive') === 'true';
    const list = await suppliers.list(tenantId, includeInactive);
    return NextResponse.json({ items: list });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await getAuthContext();
    const input = createSupplierSchema.parse(await req.json());
    const row = await suppliers.create(tenantId, input);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
