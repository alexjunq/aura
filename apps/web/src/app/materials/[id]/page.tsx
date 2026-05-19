import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as materials from '@/modules/materials/service';
import * as inventory from '@/modules/inventory/service';
import * as suppliers from '@/modules/suppliers/service';
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

  const [prices, current, movements, report, allSuppliers] = await Promise.all([
    materials.listPrices(ctx.tenantId, id, { limit: 50 }),
    materials.currentPrices(ctx.tenantId, id),
    inventory.listMovements(ctx.tenantId, id),
    inventory.currentInventory(ctx.tenantId),
    suppliers.list(ctx.tenantId, true),
  ]);
  const supplierMap = new Map(allSuppliers.map((s) => [s.id, s.name] as const));
  const onHand = report.find((r) => r.materialId === id)?.onHand ?? '0';

  return (
    <PageShell
      title={material.name}
      subtitle={`Unit: ${material.unit} · Kind: ${material.kind} · On hand: ${onHand} ${material.unit}`}
    >
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
        <h2 style={sectionHeading}>Stock movements</h2>
        {movements.length === 0 ? (
          <p style={{ color: '#888' }}>
            None yet. Use the <Link href="/inventory">inventory page</Link> to record a purchase.
          </p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>When</th>
                <th style={thStyle}>Kind</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Qty</th>
                <th style={thStyle}>Supplier / Piece</th>
                <th style={thStyle}>Unit cost</th>
                <th style={thStyle}>Note</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td style={tdStyle}>{new Date(m.occurredAt).toLocaleString()}</td>
                  <td style={tdStyle}>{m.kind}</td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: 'right',
                      color: Number(m.quantity) < 0 ? '#9a2929' : '#0a6',
                    }}
                  >
                    {m.quantity}
                  </td>
                  <td style={tdStyle}>
                    {m.supplierId
                      ? supplierMap.get(m.supplierId) ?? m.supplierId
                      : m.pieceId
                        ? <Link href={`/pieces/${m.pieceId}`}>piece</Link>
                        : '—'}
                  </td>
                  <td style={tdStyle}>{m.unitCost ? `${m.unitCost} ${m.currency}` : '—'}</td>
                  <td style={tdStyle}>{m.reference ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
