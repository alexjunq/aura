import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse, errors } from '@/shared/api-errors';
import * as pieces from '@/modules/pieces/service';

export const runtime = 'nodejs';

const stopBody = z
  .object({ note: z.string().max(2000).nullable().optional() })
  .strict()
  .optional();

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;

    // Find the active session for this tenant + piece. If none, 409.
    const active = await pieces.activeSession(tenantId);
    if (!active || active.pieceId !== id) {
      throw errors.conflict('no active session for this piece');
    }

    const text = (await req.text()) || '{}';
    const parsed = stopBody.parse(JSON.parse(text));
    const session = await pieces.stopSession(tenantId, active.id, parsed?.note ?? null);
    return NextResponse.json(session);
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
