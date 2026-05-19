import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as pieces from '@/modules/pieces/service';
import { updatePieceSchema } from '@/modules/pieces/schema';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    const piece = await pieces.get(tenantId, id);
    const [materials, sessions, history, total] = await Promise.all([
      pieces.listMaterials(tenantId, id),
      pieces.listSessions(tenantId, id),
      pieces.statusHistory(tenantId, id),
      pieces.totalSessionSeconds(tenantId, id),
    ]);
    return NextResponse.json({ piece, materials, sessions, history, totalSessionSeconds: total });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    const patch = updatePieceSchema.parse(await req.json());
    const row = await pieces.update(tenantId, id, patch);
    return NextResponse.json(row);
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
