import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as channels from '@/modules/channels/service';
import { updateChannelSchema } from '@/modules/channels/schema';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    return NextResponse.json(await channels.get(tenantId, id));
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    const patch = updateChannelSchema.parse(await req.json());
    return NextResponse.json(await channels.update(tenantId, id, patch));
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { tenantId } = await getAuthContext();
    const { id } = await params;
    await channels.deactivate(tenantId, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
