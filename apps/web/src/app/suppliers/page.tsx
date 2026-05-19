import { redirect } from 'next/navigation';
import Link from 'next/link';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as suppliers from '@/modules/suppliers/service';
import { PageShell, tableStyle, tdStyle, thStyle } from '@/shared/layout';
import { NewSupplierForm } from './NewSupplierForm';

export const dynamic = 'force-dynamic';

export default async function SuppliersListPage() {
  const ctx = await tryGetAuthContext();
  if (!ctx) redirect('/signin?next=/suppliers');
  const rows = await suppliers.list(ctx.tenantId);

  return (
    <PageShell title="Suppliers" subtitle="Where you source materials from.">
      <NewSupplierForm />
      {rows.length === 0 ? (
        <p style={{ color: '#888', marginTop: '1.5rem' }}>No suppliers yet.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Contact</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Phone</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td style={tdStyle}>
                  <Link href={`/suppliers/${s.id}`}>{s.name}</Link>
                </td>
                <td style={tdStyle}>{s.contactName ?? '—'}</td>
                <td style={tdStyle}>{s.email ?? '—'}</td>
                <td style={tdStyle}>{s.phone ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageShell>
  );
}
