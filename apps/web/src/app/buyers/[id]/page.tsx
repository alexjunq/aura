import { redirect, notFound } from 'next/navigation';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as buyers from '@/modules/buyers/service';
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
  const interactions = await buyers.listInteractions(ctx.tenantId, id);

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
        <p style={{ color: '#888' }}>(Will populate once you record sales — Phase 6.)</p>
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
