import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as sales from '@/modules/sales/service';
import { listSalesQuerySchema, recordSaleSchema } from '@/modules/sales/schema';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { tenantId } = await getAuthContext();
    const url = new URL(req.url);
    const q = listSalesQuerySchema.parse({
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
      channelId: url.searchParams.get('channelId') ?? undefined,
      buyerId: url.searchParams.get('buyerId') ?? undefined,
      pieceId: url.searchParams.get('pieceId') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });
    const items = await sales.list(tenantId, q);
    return NextResponse.json({ items });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId, userId } = await getAuthContext();
    const input = recordSaleSchema.parse(await req.json());
    const row = await sales.recordSale(tenantId, userId, input);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
