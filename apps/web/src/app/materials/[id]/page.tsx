import { redirect, notFound } from 'next/navigation';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as materials from '@/modules/materials/service';
import { PageShell, tableStyle, tdStyle, thStyle } from '@/shared/layout';
import { errors } from '@/shared/api-errors';
import { NewManualPriceForm } from './NewManualPriceForm';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export default async function MaterialDetailPage({ params }: Params) {
  const ctx = await tryGetAuthContext();
  if (!ctx) redirect('/signin');

  const { id } = await params;
  let material;
  try {
    material = await materials.get(ctx.tenantId, id);
  } catch (err) {
    if (err instanceof Object && 'code' in err && (err as { code: string }).code === 'not_found') {
      notFound();
    }
    throw err;
  }
  // typescript: errors.notFound is unused — silence by referencing
  void errors;

  const prices = await materials.listPrices(ctx.tenantId, id, { limit: 50 });
  const current = await materials.currentPrices(ctx.tenantId, id);

  return (
    <PageShell title={material.name} subtitle={`Unit: ${material.unit} · Kind: ${material.kind}`}>
      <section>
        <h2 style={sectionHeading}>Current prices</h2>
        {current.length === 0 ? (
          <p style={{ color: '#888' }}>No prices recorded yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Supplier</th>
                <th style={thStyle}>Price / unit</th>
                <th style={thStyle}>Currency</th>
                <th style={thStyle}>FX → base</th>
                <th style={thStyle}>As of</th>
              </tr>
            </thead>
            <tbody>
              {current.map((p) => (
                <tr key={`${p.source}|${p.supplierId ?? ''}`}>
                  <td style={tdStyle}>{p.source}</td>
                  <td style={tdStyle}>{p.supplierId ?? '—'}</td>
                  <td style={tdStyle}>{p.pricePerUnit}</td>
                  <td style={tdStyle}>{p.currency}</td>
                  <td style={tdStyle}>{p.fxRateToBase}</td>
                  <td style={tdStyle}>{new Date(p.effectiveAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={sectionHeading}>Record a manual price</h2>
        <NewManualPriceForm materialId={id} />
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={sectionHeading}>Price history</h2>
        {prices.length === 0 ? (
          <p style={{ color: '#888' }}>No prices recorded yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>When</th>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Supplier</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>Ccy</th>
                <th style={thStyle}>FX</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((p) => (
                <tr key={p.id}>
                  <td style={tdStyle}>{new Date(p.effectiveAt).toLocaleString()}</td>
                  <td style={tdStyle}>{p.source}</td>
                  <td style={tdStyle}>{p.supplierId ?? '—'}</td>
                  <td style={tdStyle}>{p.pricePerUnit}</td>
                  <td style={tdStyle}>{p.currency}</td>
                  <td style={tdStyle}>{p.fxRateToBase}</td>
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
