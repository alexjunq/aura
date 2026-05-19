import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as buyers from '@/modules/buyers/service';
import { createBuyerSchema, listBuyersQuerySchema } from '@/modules/buyers/schema';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { tenantId } = await getAuthContext();
    const url = new URL(req.url);
    const q = listBuyersQuerySchema.parse({
      q: url.searchParams.get('q') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });
    const items = await buyers.list(tenantId, q);
    return NextResponse.json({ items });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await getAuthContext();
    const input = createBuyerSchema.parse(await req.json());
    const row = await buyers.create(tenantId, input);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
