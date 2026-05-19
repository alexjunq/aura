import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as pieces from '@/modules/pieces/service';
import { transitionStatusSchema } from '@/modules/pieces/schema';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { tenantId, userId } = await getAuthContext();
    const { id } = await params;
    const input = transitionStatusSchema.parse(await req.json());
    const row = await pieces.transitionStatusFromRoute(tenantId, userId, id, input);
    return NextResponse.json(row);
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
