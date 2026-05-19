import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as pieces from '@/modules/pieces/service';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    const session = await pieces.startSession(tenantId, id);
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
