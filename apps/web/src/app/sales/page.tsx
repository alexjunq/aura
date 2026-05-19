import { redirect } from 'next/navigation';
import Link from 'next/link';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as sales from '@/modules/sales/service';
import * as pieces from '@/modules/pieces/service';
import * as buyers from '@/modules/buyers/service';
import * as channels from '@/modules/channels/service';
import { PageShell, tableStyle, tdStyle, thStyle } from '@/shared/layout';

export const dynamic = 'force-dynamic';

export default async function SalesListPage() {
  const ctx = await tryGetAuthContext();
  if (!ctx) redirect('/signin?next=/sales');
  const items = await sales.list(ctx.tenantId, { limit: 200 });

  // Fetch related rows in parallel so the table can show names instead of ids.
  const [allPieces, allBuyers, allChannels] = await Promise.all([
    pieces.list(ctx.tenantId, {}),
    buyers.list(ctx.tenantId, { includeRetired: true, limit: 500 }),
    channels.list(ctx.tenantId, true),
  ]);
  const pieceTitle = new Map(allPieces.map((p) => [p.id, p.title] as const));
  const buyerName = new Map(allBuyers.map((b) => [b.id, b.name] as const));
  const channelName = new Map(allChannels.map((c) => [c.id, c.name] as const));

  return (
    <PageShell title="Sales" subtitle="Every sale you've recorded.">
      {items.length === 0 ? (
        <p style={{ color: '#888', marginTop: '1rem' }}>
          No sales yet. Open a piece&apos;s detail page to record one.
        </p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Sold at</th>
              <th style={thStyle}>Piece</th>
              <th style={thStyle}>Buyer</th>
              <th style={thStyle}>Channel</th>
              <th style={thStyle}>Sale price</th>
              <th style={thStyle}>Net</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td style={tdStyle}>{new Date(s.soldAt).toLocaleString()}</td>
                <td style={tdStyle}>
                  <Link href={`/pieces/${s.pieceId}`}>{pieceTitle.get(s.pieceId) ?? s.pieceId}</Link>
                </td>
                <td style={tdStyle}>
                  <Link href={`/buyers/${s.buyerId}`}>{buyerName.get(s.buyerId) ?? s.buyerId}</Link>
                </td>
                <td style={tdStyle}>{channelName.get(s.channelId) ?? s.channelId}</td>
                <td style={tdStyle}>
                  {s.salePrice} {s.currency}
                </td>
                <td style={tdStyle}>{s.netAmount}</td>
                <td style={tdStyle}>
                  {s.refundedAt ? (
                    <span style={{ color: '#9a2929' }}>refunded</span>
                  ) : (
                    <span style={{ color: '#0a6' }}>active</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageShell>
  );
}
