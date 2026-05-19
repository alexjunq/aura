import { redirect, notFound } from 'next/navigation';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as suppliers from '@/modules/suppliers/service';
import * as materials from '@/modules/materials/service';
import { PageShell, tableStyle, tdStyle, thStyle } from '@/shared/layout';
import { LinkMaterialForm } from './LinkMaterialForm';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export default async function SupplierDetailPage({ params }: Params) {
  const ctx = await tryGetAuthContext();
  if (!ctx) redirect('/signin');

  const { id } = await params;
  let supplier;
  try {
    supplier = await suppliers.get(ctx.tenantId, id);
  } catch (err) {
    if (err instanceof Object && 'code' in err && (err as { code: string }).code === 'not_found') {
      notFound();
    }
    throw err;
  }

  const linked = await suppliers.listMaterials(ctx.tenantId, id);
  const allMaterials = await materials.list(ctx.tenantId);
  const matName = new Map(allMaterials.map((m) => [m.id, m.name] as const));

  return (
    <PageShell
      title={supplier.name}
      subtitle={supplier.contactName ? `Contact: ${supplier.contactName}` : undefined}
    >
      <p style={{ color: '#555' }}>
        {[supplier.email, supplier.phone, supplier.website].filter(Boolean).join(' · ') || '—'}
      </p>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={sectionHeading}>Materials supplied</h2>
        <LinkMaterialForm supplierId={id} materials={allMaterials} />
        {linked.length === 0 ? (
          <p style={{ color: '#888' }}>None linked yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Material</th>
                <th style={thStyle}>SKU</th>
                <th style={thStyle}>Lead time (days)</th>
              </tr>
            </thead>
            <tbody>
              {linked.map((sm) => (
                <tr key={sm.materialId}>
                  <td style={tdStyle}>
                    <a href={`/materials/${sm.materialId}`}>
                      {matName.get(sm.materialId) ?? sm.materialId}
                    </a>
                  </td>
                  <td style={tdStyle}>{sm.sku ?? '—'}</td>
                  <td style={tdStyle}>{sm.defaultLeadTimeDays ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </PageShell>
  );
}

const sectionHeading: React.CSSProperties = { marginTop: 0, fontSize: '1.05rem' };
