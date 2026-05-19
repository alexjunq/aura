import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as reports from '@/modules/reports/service';
import { inventoryQuerySchema } from '@/modules/reports/schema';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { tenantId } = await getAuthContext();
    const url = new URL(req.url);
    const query = inventoryQuerySchema.parse({
      groupBy: url.searchParams.get('groupBy') ?? undefined,
    });
    const rows = await reports.inventory(tenantId, query);
    const format = url.searchParams.get('format');
    if (format === 'csv') {
      const csv = Papa.unparse(rows);
      return new NextResponse(csv, {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="inventory.csv"',
        },
      });
    }
    return NextResponse.json({ items: rows });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
