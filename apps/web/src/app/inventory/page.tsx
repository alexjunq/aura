import { redirect } from 'next/navigation';
import Link from 'next/link';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as inventory from '@/modules/inventory/service';
import * as materials from '@/modules/materials/service';
import * as suppliers from '@/modules/suppliers/service';
import * as settings from '@/modules/settings/service';
import { PageShell, tableStyle, tdStyle, thStyle } from '@/shared/layout';
import { RecordPurchaseForm } from './RecordPurchaseForm';
import { RecordAdjustmentForm } from './RecordAdjustmentForm';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const ctx = await tryGetAuthContext();
  if (!ctx) redirect('/signin?next=/inventory');

  const [report, allMaterials, allSuppliers, tenantSettings, recentMovements] = await Promise.all([
    inventory.currentInventory(ctx.tenantId),
    materials.list(ctx.tenantId),
    suppliers.list(ctx.tenantId),
    settings.getSettings(ctx.tenantId),
    inventory.listMovements(ctx.tenantId),
  ]);

  const materialMap = new Map(allMaterials.map((m) => [m.id, m] as const));
  const supplierMap = new Map(allSuppliers.map((s) => [s.id, s.name] as const));

  return (
    <PageShell
      title="Inventory"
      subtitle={`Raw materials on hand. Base currency ${tenantSettings.baseCurrency}.`}
    >
      <section style={section}>
        <h2 style={h2}>Buy materials (record a purchase)</h2>
        <RecordPurchaseForm
          materials={allMaterials.map((m) => ({ id: m.id, label: `${m.name} (${m.unit})` }))}
          suppliers={allSuppliers.map((s) => ({ id: s.id, label: s.name }))}
          baseCurrency={tenantSettings.baseCurrency}
        />
      </section>

      <section style={section}>
        <h2 style={h2}>Current inventory</h2>
        {report.length === 0 ? (
          <p style={{ color: '#888' }}>
            No materials yet. Add some on the <Link href="/materials">materials</Link> page first.
          </p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Material</th>
                <th style={thStyle}>Kind</th>
                <th style={thStyle}>Unit</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>On hand</th>
              </tr>
            </thead>
            <tbody>
              {report.map((r) => {
                const negative = Number(r.onHand) < 0;
                return (
                  <tr key={r.materialId}>
                    <td style={tdStyle}>
                      <Link href={`/materials/${r.materialId}`}>{r.name}</Link>
                    </td>
                    <td style={tdStyle}>{r.kind}</td>
                    <td style={tdStyle}>{r.unit}</td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: 'right',
                        color: negative ? '#9a2929' : undefined,
                        fontWeight: 600,
                      }}
                    >
                      {r.onHand}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section style={section}>
        <h2 style={h2}>Adjust stock</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>
          Use signed quantities: positive to write up (re-count), negative to write down (breakage, loss).
        </p>
        <RecordAdjustmentForm
          materials={allMaterials.map((m) => ({ id: m.id, label: `${m.name} (${m.unit})` }))}
        />
      </section>

      <section style={section}>
        <h2 style={h2}>Recent movements</h2>
        {recentMovements.length === 0 ? (
          <p style={{ color: '#888' }}>None yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>When</th>
                <th style={thStyle}>Material</th>
                <th style={thStyle}>Kind</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Qty</th>
                <th style={thStyle}>Supplier / Piece</th>
                <th style={thStyle}>Unit cost</th>
                <th style={thStyle}>Note</th>
              </tr>
            </thead>
            <tbody>
              {recentMovements.slice(0, 50).map((m) => {
                const mat = materialMap.get(m.materialId);
                return (
                  <tr key={m.id}>
                    <td style={tdStyle}>{new Date(m.occurredAt).toLocaleString()}</td>
                    <td style={tdStyle}>{mat?.name ?? m.materialId}</td>
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
                    <td style={tdStyle}>
                      {m.unitCost ? `${m.unitCost} ${m.currency}` : '—'}
                    </td>
                    <td style={tdStyle}>{m.reference ?? ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </PageShell>
  );
}

const section: React.CSSProperties = { marginTop: '2rem' };
const h2: React.CSSProperties = { fontSize: '1.05rem', margin: '0 0 0.5rem' };
