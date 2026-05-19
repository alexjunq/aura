import { redirect } from 'next/navigation';
import Link from 'next/link';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as buyers from '@/modules/buyers/service';
import { PageShell, tableStyle, tdStyle, thStyle } from '@/shared/layout';
import { NewBuyerForm } from './NewBuyerForm';

export const dynamic = 'force-dynamic';

export default async function BuyersListPage() {
  const ctx = await tryGetAuthContext();
  if (!ctx) redirect('/signin?next=/buyers');
  const items = await buyers.list(ctx.tenantId, { limit: 100 });
  return (
    <PageShell title="Buyers" subtitle="The people who buy your work.">
      <NewBuyerForm />
      {items.length === 0 ? (
        <p style={{ color: '#888', marginTop: '1.5rem' }}>No buyers yet.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Instagram</th>
              <th style={thStyle}>Interests</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id}>
                <td style={tdStyle}>
                  <Link href={`/buyers/${b.id}`}>{b.name}</Link>
                </td>
                <td style={tdStyle}>{b.email ?? '—'}</td>
                <td style={tdStyle}>{b.phone ?? '—'}</td>
                <td style={tdStyle}>{b.instagram ?? '—'}</td>
                <td style={tdStyle}>{b.interests.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageShell>
  );
}
