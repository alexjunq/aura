import { redirect } from 'next/navigation';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as channels from '@/modules/channels/service';
import { PageShell, tableStyle, tdStyle, thStyle } from '@/shared/layout';
import { NewChannelForm } from './NewChannelForm';

export const dynamic = 'force-dynamic';

export default async function ChannelsPage() {
  const ctx = await tryGetAuthContext();
  if (!ctx) redirect('/signin?next=/channels');
  const items = await channels.list(ctx.tenantId);
  return (
    <PageShell title="Sales channels" subtitle="Where you sell pieces from.">
      <NewChannelForm />
      {items.length === 0 ? (
        <p style={{ color: '#888', marginTop: '1.5rem' }}>No channels yet.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Commission %</th>
              <th style={thStyle}>Contact</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td style={tdStyle}>{c.name}</td>
                <td style={tdStyle}>{c.type}</td>
                <td style={tdStyle}>{c.commissionPct}</td>
                <td style={tdStyle}>{c.contactName ?? c.email ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageShell>
  );
}
