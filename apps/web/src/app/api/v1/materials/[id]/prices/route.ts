import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as materials from '@/modules/materials/service';
import { createManualPriceSchema, priceQuerySchema } from '@/modules/materials/schema';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    const url = new URL(req.url);
    const query = priceQuerySchema.parse({
      source: url.searchParams.get('source') ?? undefined,
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });
    const rows = await materials.listPrices(tenantId, id, query);
    return NextResponse.json({ items: rows });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { tenantId, userId } = await getAuthContext();
    const { id } = await params;
    const input = createManualPriceSchema.parse(await req.json());
    const row = await materials.recordManualPrice(tenantId, id, userId, input);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
