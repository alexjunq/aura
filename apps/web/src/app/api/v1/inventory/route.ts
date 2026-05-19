import { NextResponse } from 'next/server';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as inventory from '@/modules/inventory/service';

export const runtime = 'nodejs';

/**
 * GET /api/v1/inventory — current inventory report. Every active material
 * with its on-hand quantity (0 if no movements recorded yet).
 */
export async function GET() {
  try {
    const { tenantId } = await getAuthContext();
    const items = await inventory.currentInventory(tenantId);
    return NextResponse.json({ items });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
