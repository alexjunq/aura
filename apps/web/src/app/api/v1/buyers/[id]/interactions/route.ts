import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as buyers from '@/modules/buyers/service';
import { createInteractionSchema } from '@/modules/buyers/schema';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    const items = await buyers.listInteractions(tenantId, id);
    return NextResponse.json({ items });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { tenantId, userId } = await getAuthContext();
    const { id } = await params;
    const input = createInteractionSchema.parse(await req.json());
    const row = await buyers.createInteraction(tenantId, id, userId, input);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
