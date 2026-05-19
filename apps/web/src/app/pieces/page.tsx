import { redirect } from 'next/navigation';
import Link from 'next/link';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as pieces from '@/modules/pieces/service';
import { PageShell, tableStyle, tdStyle, thStyle } from '@/shared/layout';
import { PIECE_STATUSES } from '@aura/domain';

export const dynamic = 'force-dynamic';

interface SearchParams {
  searchParams: Promise<{ status?: string; q?: string }>;
}

export default async function PiecesListPage({ searchParams }: SearchParams) {
  const ctx = await tryGetAuthContext();
  if (!ctx) redirect('/signin?next=/pieces');

  const sp = await searchParams;
  const status = (PIECE_STATUSES as readonly string[]).includes(sp.status ?? '')
    ? (sp.status as (typeof PIECE_STATUSES)[number])
    : undefined;
  const items = await pieces.list(ctx.tenantId, { status, q: sp.q, limit: 100 });

  return (
    <PageShell title="Pieces" subtitle="The things you make.">
      <p>
        <Link href="/pieces/new" style={primaryLink}>+ New piece</Link>
      </p>

      <form method="get" style={{ display: 'flex', gap: '0.5rem', alignItems: 'end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#444' }}>Filter by status</span>
          <select name="status" defaultValue={sp.status ?? ''} style={inputStyle}>
            <option value="">(any)</option>
            {PIECE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#444' }}>Search title</span>
          <input
            type="text"
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder="ring, sculpture…"
            style={inputStyle}
          />
        </label>
        <button type="submit" style={secondaryBtn}>Filter</button>
      </form>

      {items.length === 0 ? (
        <p style={{ color: '#888', marginTop: '1.5rem' }}>No pieces yet.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Title</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td style={tdStyle}>
                  <Link href={`/pieces/${p.id}`}>{p.title}</Link>
                </td>
                <td style={tdStyle}>{p.status}</td>
                <td style={tdStyle}>{p.category ?? '—'}</td>
                <td style={tdStyle}>{p.currentLocationText ?? '—'}</td>
                <td style={tdStyle}>{new Date(p.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageShell>
  );
}

const primaryLink: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.4rem 0.8rem',
  background: '#222',
  color: 'white',
  borderRadius: 4,
  textDecoration: 'none',
};
const inputStyle: React.CSSProperties = {
  padding: '0.45rem 0.55rem',
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: '0.95rem',
};
const secondaryBtn: React.CSSProperties = {
  padding: '0.5rem 0.8rem',
  background: 'white',
  color: '#222',
  border: '1px solid #ccc',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.95rem',
};
