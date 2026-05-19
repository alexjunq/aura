import { redirect } from 'next/navigation';
import Link from 'next/link';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as settings from '@/modules/settings/service';
import * as pieces from '@/modules/pieces/service';
import * as materials from '@/modules/materials/service';
import * as suppliers from '@/modules/suppliers/service';
import * as channels from '@/modules/channels/service';
import * as buyers from '@/modules/buyers/service';
import * as sales from '@/modules/sales/service';
import * as reports from '@/modules/reports/service';
import { PageShell } from '@/shared/layout';
import { SignOutButton } from './SignOutButton';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const ctx = await tryGetAuthContext();
  if (!ctx) redirect('/signin');

  // Start of current month (UTC) for the month-to-date revenue tile.
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  // Everything in parallel — the home page is read-only.
  const [
    studio,
    allPieces,
    allMaterials,
    allSuppliers,
    allChannels,
    allBuyers,
    recentSales,
    monthRevenue,
  ] = await Promise.all([
    settings.getSettings(ctx.tenantId),
    pieces.list(ctx.tenantId, { limit: 200 }),
    materials.list(ctx.tenantId),
    suppliers.list(ctx.tenantId),
    channels.list(ctx.tenantId),
    buyers.list(ctx.tenantId, { limit: 500 }),
    sales.list(ctx.tenantId, { limit: 5 }),
    reports.revenue(ctx.tenantId, { groupBy: 'month', from: monthStart }),
  ]);

  // Aggregate piece counts by status.
  const pieceCount = allPieces.length;
  const byStatus = new Map<string, number>();
  for (const p of allPieces) byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);

  // Month-to-date revenue (in base currency). Single bucket since we filtered to one month.
  const mtdRevenue = monthRevenue[0]?.revenueBase ?? '0';
  const mtdUnits = monthRevenue[0]?.units ?? 0;

  const pieceMap = new Map(allPieces.map((p) => [p.id, p.title] as const));
  const buyerMap = new Map(allBuyers.map((b) => [b.id, b.name] as const));
  const channelMap = new Map(allChannels.map((c) => [c.id, c.name] as const));

  return (
    <PageShell
      title={`Welcome, ${ctx.email}`}
      subtitle={`Studio: ${studio.studioName} · base ${studio.baseCurrency} · labor ${studio.hourlyLaborRate}/hr`}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-3.5rem', marginBottom: '1rem' }}>
        <SignOutButton />
      </div>

      <section style={section}>
        <h2 style={h2}>At a glance</h2>
        <div style={kpiGrid}>
          <Kpi label="Pieces · in progress" value={byStatus.get('in_progress') ?? 0} href="/pieces?status=in_progress" />
          <Kpi label="Pieces · in studio" value={byStatus.get('in_studio') ?? 0} href="/pieces?status=in_studio" />
          <Kpi label="Pieces · on sale" value={byStatus.get('on_sale') ?? 0} href="/pieces?status=on_sale" />
          <Kpi label="Pieces · sold" value={byStatus.get('sold') ?? 0} href="/pieces?status=sold" />
          <Kpi label="Total pieces" value={pieceCount} href="/pieces" />
          <Kpi
            label={`This month (${studio.baseCurrency})`}
            value={`${mtdRevenue} · ${mtdUnits} sale${mtdUnits === 1 ? '' : 's'}`}
            href="/reports"
          />
          <Kpi label="Materials" value={allMaterials.length} href="/materials" />
          <Kpi label="Suppliers" value={allSuppliers.length} href="/suppliers" />
          <Kpi label="Channels" value={allChannels.length} href="/channels" />
          <Kpi label="Buyers" value={allBuyers.length} href="/buyers" />
        </div>
      </section>

      <section style={section}>
        <h2 style={h2}>Modules</h2>
        <div style={tileGrid}>
          <Tile
            href="/pieces"
            title="Pieces"
            blurb="Track each one-of-a-kind piece through its lifecycle: materials, work sessions, sale, refund."
            cta="Open pieces"
            secondaryHref="/pieces/new"
            secondaryCta="+ new piece"
          />
          <Tile
            href="/materials"
            title="Materials"
            blurb="Gold, silver, gemstones, wood — whatever you use. Manual prices, commodity feeds, supplier prices."
            cta="Open materials"
          />
          <Tile
            href="/suppliers"
            title="Suppliers"
            blurb="Who you buy from. Link materials, capture per-supplier price history."
            cta="Open suppliers"
          />
          <Tile
            href="/channels"
            title="Sales channels"
            blurb="Online, physical store, event, direct. Each channel has its own commission %."
            cta="Open channels"
          />
          <Tile
            href="/buyers"
            title="Buyers"
            blurb="Contact details, interests, interaction log, and an auto-populated purchase history."
            cta="Open buyers"
          />
          <Tile
            href="/sales"
            title="Sales"
            blurb="Recorded sales with commission snapshot. Refund a sale and the piece flips back to returned."
            cta="Open sales"
          />
          <Tile
            href="/reports"
            title="Reports"
            blurb="Revenue by month/channel/buyer/category, inventory by status, margin per piece. CSV export."
            cta="Open reports"
          />
          <Tile
            href="/settings"
            title="Settings"
            blurb="Studio name, base currency, hourly labor rate. Drives the cost-breakdown view."
            cta="Open settings"
          />
        </div>
      </section>

      <section style={section}>
        <h2 style={h2}>Recent sales</h2>
        {recentSales.length === 0 ? (
          <p style={emptyText}>
            No sales yet. Once a piece is in <code>in_studio</code>/<code>on_sale</code>/<code>reserved</code>, open it and click <strong>Record sale</strong>.
          </p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Sold at</th>
                <th style={thStyle}>Piece</th>
                <th style={thStyle}>Buyer</th>
                <th style={thStyle}>Channel</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((s) => (
                <tr key={s.id}>
                  <td style={tdStyle}>{new Date(s.soldAt).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    <Link href={`/pieces/${s.pieceId}`}>{pieceMap.get(s.pieceId) ?? s.pieceId}</Link>
                  </td>
                  <td style={tdStyle}>
                    <Link href={`/buyers/${s.buyerId}`}>{buyerMap.get(s.buyerId) ?? s.buyerId}</Link>
                  </td>
                  <td style={tdStyle}>{channelMap.get(s.channelId) ?? s.channelId}</td>
                  <td style={tdStyle}>
                    {s.salePrice} {s.currency}
                  </td>
                  <td style={tdStyle}>
                    {s.refundedAt ? (
                      <span style={{ color: '#9a2929' }}>refunded</span>
                    ) : (
                      <span style={{ color: '#0a6' }}>active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </PageShell>
  );
}

function Kpi({ label, value, href }: { label: string; value: number | string; href: string }) {
  return (
    <Link href={href} style={kpiCard}>
      <div style={kpiValue}>{value}</div>
      <div style={kpiLabel}>{label}</div>
    </Link>
  );
}

function Tile({
  href,
  title,
  blurb,
  cta,
  secondaryHref,
  secondaryCta,
}: {
  href: string;
  title: string;
  blurb: string;
  cta: string;
  secondaryHref?: string;
  secondaryCta?: string;
}) {
  return (
    <div style={tileCard}>
      <h3 style={tileTitle}>{title}</h3>
      <p style={tileBlurb}>{blurb}</p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Link href={href} style={tilePrimary}>
          {cta}
        </Link>
        {secondaryHref && (
          <Link href={secondaryHref} style={tileSecondary}>
            {secondaryCta}
          </Link>
        )}
      </div>
    </div>
  );
}

const section: React.CSSProperties = { marginTop: '2rem' };
const h2: React.CSSProperties = { fontSize: '1.05rem', margin: '0 0 0.75rem' };
const emptyText: React.CSSProperties = { color: '#888' };

const kpiGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: '0.6rem',
};
const kpiCard: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.2rem',
  padding: '0.75rem 0.9rem',
  border: '1px solid #e5e5e5',
  borderRadius: 6,
  background: '#fafafa',
  color: 'inherit',
  textDecoration: 'none',
};
const kpiValue: React.CSSProperties = { fontSize: '1.3rem', fontWeight: 600 };
const kpiLabel: React.CSSProperties = { fontSize: '0.8rem', color: '#666' };

const tileGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: '0.8rem',
};
const tileCard: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  padding: '1rem',
  border: '1px solid #e5e5e5',
  borderRadius: 6,
  background: 'white',
};
const tileTitle: React.CSSProperties = { fontSize: '1rem', margin: 0 };
const tileBlurb: React.CSSProperties = { fontSize: '0.85rem', color: '#555', margin: 0, flex: 1 };
const tilePrimary: React.CSSProperties = {
  padding: '0.4rem 0.7rem',
  background: '#222',
  color: 'white',
  borderRadius: 4,
  fontSize: '0.85rem',
  textDecoration: 'none',
};
const tileSecondary: React.CSSProperties = {
  padding: '0.4rem 0.7rem',
  background: 'white',
  color: '#222',
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: '0.85rem',
  textDecoration: 'none',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '0.5rem',
  fontSize: '0.95rem',
};
const thStyle: React.CSSProperties = {
  borderBottom: '1px solid #ddd',
  textAlign: 'left',
  padding: '0.5rem 0.4rem',
  fontWeight: 600,
};
const tdStyle: React.CSSProperties = {
  borderBottom: '1px solid #eee',
  padding: '0.5rem 0.4rem',
};
