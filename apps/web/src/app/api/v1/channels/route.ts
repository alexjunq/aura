import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as channels from '@/modules/channels/service';
import { createChannelSchema } from '@/modules/channels/schema';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { tenantId } = await getAuthContext();
    const items = await channels.list(tenantId);
    return NextResponse.json({ items });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await getAuthContext();
    const input = createChannelSchema.parse(await req.json());
    const row = await channels.create(tenantId, input);
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
