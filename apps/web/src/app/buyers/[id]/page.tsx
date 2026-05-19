import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as buyers from '@/modules/buyers/service';
import * as sales from '@/modules/sales/service';
import * as pieces from '@/modules/pieces/service';
import { PageShell, tableStyle, tdStyle, thStyle } from '@/shared/layout';
import { NewInteractionForm } from './NewInteractionForm';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export default async function BuyerDetailPage({ params }: Params) {
  const ctx = await tryGetAuthContext();
  if (!ctx) redirect('/signin');
  const { id } = await params;

  let buyer;
  try {
    buyer = await buyers.get(ctx.tenantId, id);
  } catch (err) {
    if (err instanceof Object && 'code' in err && (err as { code: string }).code === 'not_found') notFound();
    throw err;
  }
  const [interactions, purchases, allPieces] = await Promise.all([
    buyers.listInteractions(ctx.tenantId, id),
    sales.listForBuyer(ctx.tenantId, id),
    pieces.list(ctx.tenantId, {}),
  ]);
  const pieceTitle = new Map(allPieces.map((p) => [p.id, p.title] as const));

  return (
    <PageShell title={buyer.name} subtitle={[buyer.email, buyer.phone, buyer.instagram].filter(Boolean).join(' · ') || undefined}>
      <section style={{ marginTop: '1rem' }}>
        <p style={{ color: '#555' }}>
          {buyer.interests.length > 0 ? `Interests: ${buyer.interests.join(', ')}` : 'No interests recorded.'}
        </p>
        {buyer.notes && <p style={{ whiteSpace: 'pre-wrap' }}>{buyer.notes}</p>}
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={h2}>Purchases</h2>
        {purchases.length === 0 ? (
          <p style={{ color: '#888' }}>No purchases yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Sold at</th>
                <th style={thStyle}>Piece</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((s) => (
                <tr key={s.id}>
                  <td style={tdStyle}>{new Date(s.soldAt).toLocaleString()}</td>
                  <td style={tdStyle}>
                    <Link href={`/pieces/${s.pieceId}`}>
                      {pieceTitle.get(s.pieceId) ?? s.pieceId}
                    </Link>
                  </td>
                  <td style={tdStyle}>
                    {s.salePrice} {s.currency}
                  </td>
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
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={h2}>Interactions</h2>
        <NewInteractionForm buyerId={id} />
        {interactions.length === 0 ? (
          <p style={{ color: '#888' }}>None yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>When</th>
                <th style={thStyle}>Kind</th>
                <th style={thStyle}>Summary</th>
              </tr>
            </thead>
            <tbody>
              {interactions.map((it) => (
                <tr key={it.id}>
                  <td style={tdStyle}>{new Date(it.occurredAt).toLocaleString()}</td>
                  <td style={tdStyle}>{it.kind}</td>
                  <td style={tdStyle}>{it.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </PageShell>
  );
}

const h2: React.CSSProperties = { fontSize: '1.05rem', margin: '0 0 0.5rem' };
