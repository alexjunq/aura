import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as settings from '@/modules/settings/service';
import { updateSettingsSchema } from '@/modules/settings/schema';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { tenantId } = await getAuthContext();
    const data = await settings.getSettings(tenantId);
    return NextResponse.json(data);
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const { tenantId } = await getAuthContext();
    const patch = updateSettingsSchema.parse(await req.json());
    const data = await settings.updateSettings(tenantId, patch);
    return NextResponse.json(data);
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
