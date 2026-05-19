import { redirect } from 'next/navigation';
import Link from 'next/link';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as materials from '@/modules/materials/service';
import { PageShell, tableStyle, tdStyle, thStyle } from '@/shared/layout';
import { NewMaterialForm } from './NewMaterialForm';

export const dynamic = 'force-dynamic';

export default async function MaterialsListPage() {
  const ctx = await tryGetAuthContext();
  if (!ctx) redirect('/signin?next=/materials');
  const rows = await materials.list(ctx.tenantId);

  return (
    <PageShell title="Materials" subtitle="What you make pieces from.">
      <NewMaterialForm />
      {rows.length === 0 ? (
        <p style={{ color: '#888', marginTop: '1.5rem' }}>No materials yet. Add one above.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Unit</th>
              <th style={thStyle}>Kind</th>
              <th style={thStyle}>Commodity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td style={tdStyle}>
                  <Link href={`/materials/${m.id}`}>{m.name}</Link>
                </td>
                <td style={tdStyle}>{m.unit}</td>
                <td style={tdStyle}>{m.kind}</td>
                <td style={tdStyle}>{m.commoditySymbol ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageShell>
  );
}
