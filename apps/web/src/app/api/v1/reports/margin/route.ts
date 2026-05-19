import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { getAuthContext } from '@/shared/auth-context';
import { toApiErrorResponse } from '@/shared/api-errors';
import * as reports from '@/modules/reports/service';
import { marginQuerySchema } from '@/modules/reports/schema';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { tenantId } = await getAuthContext();
    const url = new URL(req.url);
    const query = marginQuerySchema.parse({
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
    });
    const rows = await reports.margin(tenantId, query);
    const format = url.searchParams.get('format');
    if (format === 'csv') {
      const serializable = rows.map((r) => ({
        ...r,
        soldAt: r.soldAt.toISOString(),
      }));
      const csv = Papa.unparse(serializable);
      return new NextResponse(csv, {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="margin.csv"',
        },
      });
    }
    return NextResponse.json({ items: rows });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
