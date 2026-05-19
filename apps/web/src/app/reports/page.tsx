import { redirect } from 'next/navigation';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as reports from '@/modules/reports/service';
import * as settings from '@/modules/settings/service';
import { PageShell, tableStyle, tdStyle, thStyle } from '@/shared/layout';

export const dynamic = 'force-dynamic';

interface SearchParams {
  searchParams: Promise<{ groupBy?: string; from?: string; to?: string }>;
}

export default async function ReportsPage({ searchParams }: SearchParams) {
  const ctx = await tryGetAuthContext();
  if (!ctx) redirect('/signin?next=/reports');

  const sp = await searchParams;
  const groupBy = (['month', 'channel', 'buyer', 'category'] as const).includes(sp.groupBy as never)
    ? (sp.groupBy as 'month' | 'channel' | 'buyer' | 'category')
    : 'month';
  const from = sp.from ? new Date(sp.from) : undefined;
  const to = sp.to ? new Date(sp.to) : undefined;

  const [revenue, inventoryByStatus, margin, tenantSettings] = await Promise.all([
    reports.revenue(ctx.tenantId, { groupBy, from, to }),
    reports.inventory(ctx.tenantId, { groupBy: 'status' }),
    reports.margin(ctx.tenantId, { from, to }),
    settings.getSettings(ctx.tenantId),
  ]);
  const base = tenantSettings.baseCurrency;

  return (
    <PageShell title="Reports" subtitle={`All amounts in ${base}.`}>
      <form method="get" style={filterRow}>
        <label style={fs}>
          <span style={lb}>Group revenue by</span>
          <select name="groupBy" defaultValue={groupBy} style={inp}>
            <option value="month">month</option>
            <option value="channel">channel</option>
            <option value="buyer">buyer</option>
            <option value="category">category</option>
          </select>
        </label>
        <label style={fs}>
          <span style={lb}>From</span>
          <input type="date" name="from" defaultValue={sp.from ?? ''} style={inp} />
        </label>
        <label style={fs}>
          <span style={lb}>To</span>
          <input type="date" name="to" defaultValue={sp.to ?? ''} style={inp} />
        </label>
        <button type="submit" style={btn}>Filter</button>
      </form>

      <section style={section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={h2}>Revenue by {groupBy}</h2>
          <a
            href={`/api/v1/reports/revenue?groupBy=${groupBy}&format=csv${from ? `&from=${from.toISOString()}` : ''}${to ? `&to=${to.toISOString()}` : ''}`}
            style={csvLink}
          >
            Download CSV
          </a>
        </div>
        {revenue.length === 0 ? (
          <p style={{ color: '#888' }}>No sales in this range.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Bucket</th>
                <th style={thStyle}>Units</th>
                <th style={thStyle}>Gross revenue ({base})</th>
                <th style={thStyle}>Net revenue ({base})</th>
              </tr>
            </thead>
            <tbody>
              {revenue.map((r) => (
                <tr key={r.key}>
                  <td style={tdStyle}>{r.label}</td>
                  <td style={tdStyle}>{r.units}</td>
                  <td style={tdStyle}>{r.revenueBase}</td>
                  <td style={tdStyle}>{r.netBase}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={h2}>Inventory by status</h2>
          <a href={`/api/v1/reports/inventory?groupBy=status&format=csv`} style={csvLink}>
            Download CSV
          </a>
        </div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Count</th>
            </tr>
          </thead>
          <tbody>
            {inventoryByStatus.map((r) => (
              <tr key={r.key}>
                <td style={tdStyle}>{r.label}</td>
                <td style={tdStyle}>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={h2}>Margin per piece</h2>
          <a
            href={`/api/v1/reports/margin?format=csv${from ? `&from=${from.toISOString()}` : ''}${to ? `&to=${to.toISOString()}` : ''}`}
            style={csvLink}
          >
            Download CSV
          </a>
        </div>
        {margin.length === 0 ? (
          <p style={{ color: '#888' }}>No sales recorded yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Sold at</th>
                <th style={thStyle}>Piece</th>
                <th style={thStyle}>Sale ({base})</th>
                <th style={thStyle}>Net ({base})</th>
                <th style={thStyle}>Cost ({base})</th>
                <th style={thStyle}>Margin ({base})</th>
                <th style={thStyle}>Margin %</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {margin.map((r) => (
                <tr key={r.pieceId + r.soldAt.toISOString()}>
                  <td style={tdStyle}>{new Date(r.soldAt).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    <a href={`/pieces/${r.pieceId}`}>{r.pieceTitle}</a>
                  </td>
                  <td style={tdStyle}>{r.salePriceBase}</td>
                  <td style={tdStyle}>{r.netRevenueBase}</td>
                  <td style={tdStyle}>{r.totalCostBase}</td>
                  <td style={tdStyle}>{r.marginBase}</td>
                  <td style={tdStyle}>{r.marginPct}%</td>
                  <td style={tdStyle}>{r.refunded ? 'refunded' : 'active'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </PageShell>
  );
}

const fs: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.2rem' };
const lb: React.CSSProperties = { fontSize: '0.8rem', color: '#444' };
const inp: React.CSSProperties = {
  padding: '0.45rem 0.55rem',
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: '0.95rem',
};
const btn: React.CSSProperties = {
  padding: '0.5rem 0.8rem',
  background: '#222',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.95rem',
};
const filterRow: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'end',
  marginBottom: '1rem',
};
const section: React.CSSProperties = { marginTop: '2rem' };
const h2: React.CSSProperties = { fontSize: '1.05rem', margin: '0 0 0.5rem' };
const csvLink: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#0a6',
  textDecoration: 'none',
};
