import { redirect, notFound } from 'next/navigation';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as pieces from '@/modules/pieces/service';
import * as materials from '@/modules/materials/service';
import * as channelsService from '@/modules/channels/service';
import * as buyersService from '@/modules/buyers/service';
import * as sales from '@/modules/sales/service';
import * as pricing from '@/modules/pricing/service';
import * as settings from '@/modules/settings/service';
import { SELLABLE_STATUSES } from '@aura/domain';
import { PageShell, tableStyle, tdStyle, thStyle } from '@/shared/layout';
import { TimerControls } from './TimerControls';
import { AddMaterialForm } from './AddMaterialForm';
import { StatusActions } from './StatusActions';
import { ChannelActions } from './ChannelActions';
import { RecordSaleForm } from './RecordSaleForm';
import { RefundButton } from './RefundButton';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export default async function PieceDetailPage({ params }: Params) {
  const ctx = await tryGetAuthContext();
  if (!ctx) redirect('/signin');
  const { id } = await params;

  let piece;
  try {
    piece = await pieces.get(ctx.tenantId, id);
  } catch (err) {
    if (err instanceof Object && 'code' in err && (err as { code: string }).code === 'not_found') {
      notFound();
    }
    throw err;
  }

  const [
    pieceMaterials,
    sessions,
    history,
    totalSec,
    allMaterials,
    allChannels,
    allBuyers,
    activeSession,
    breakdown,
    saleHistory,
    tenantSettings,
  ] = await Promise.all([
    pieces.listMaterials(ctx.tenantId, id),
    pieces.listSessions(ctx.tenantId, id),
    pieces.statusHistory(ctx.tenantId, id),
    pieces.totalSessionSeconds(ctx.tenantId, id),
    materials.list(ctx.tenantId),
    channelsService.list(ctx.tenantId),
    buyersService.list(ctx.tenantId, { limit: 500 }),
    pieces.activeSession(ctx.tenantId),
    pricing.breakdown(ctx.tenantId, id),
    sales.list(ctx.tenantId, { pieceId: id, limit: 50 }),
    settings.getSettings(ctx.tenantId),
  ]);
  const totalHours = (totalSec / 3600).toFixed(2);

  const isSellable = SELLABLE_STATUSES.has(piece.status);
  const activeSale = saleHistory.find((s) => !s.refundedAt);

  return (
    <PageShell
      title={piece.title}
      subtitle={`Status: ${piece.status} · Hours: ${totalHours} · Materials cost: ${breakdown.materials.totalBase} (${tenantSettings.baseCurrency})`}
    >
      <section style={section}>
        <h2 style={h2}>Status</h2>
        <StatusActions piece={piece} />
        {(piece.status === 'in_studio' ||
          piece.status === 'on_sale' ||
          piece.status === 'reserved') && (
          <div style={{ marginTop: '0.8rem' }}>
            <ChannelActions
              pieceId={piece.id}
              channels={allChannels.map((c) => ({
                id: c.id,
                name: c.name,
                commissionPct: c.commissionPct,
              }))}
              showOnSale={piece.status !== 'on_sale'}
              showReserve={piece.status !== 'reserved'}
            />
          </div>
        )}
      </section>

      {isSellable && (
        <section style={section}>
          <h2 style={h2}>Record sale</h2>
          <RecordSaleForm
            pieceId={piece.id}
            buyers={allBuyers.map((b) => ({ id: b.id, label: b.name }))}
            channels={allChannels.map((c) => ({ id: c.id, label: `${c.name} (${c.commissionPct}%)` }))}
            baseCurrency={tenantSettings.baseCurrency}
          />
        </section>
      )}

      <section style={section}>
        <h2 style={h2}>Cost breakdown ({tenantSettings.baseCurrency})</h2>
        <p style={{ margin: '0 0 0.5rem', color: '#555' }}>
          Materials: <strong>{breakdown.materials.totalBase}</strong> · Labor: <strong>{breakdown.labor.totalBase}</strong> ({breakdown.labor.hours} h × {breakdown.labor.hourlyRateBase}) · <strong>Total: {breakdown.totalCostBase}</strong>
          {breakdown.atCurrentPrices.totalCostBase !== breakdown.totalCostBase && (
            <>
              {' '}
              <span style={{ color: '#888' }}>
                (at current material prices: {breakdown.atCurrentPrices.totalCostBase})
              </span>
            </>
          )}
          {breakdown.lastSalePriceBase && (
            <>
              {' '}· Sold for <strong>{breakdown.lastSalePriceBase}</strong>
            </>
          )}
        </p>
      </section>

      {saleHistory.length > 0 && (
        <section style={section}>
          <h2 style={h2}>Sales</h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Sold at</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>Channel commission</th>
                <th style={thStyle}>Net</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {saleHistory.map((s) => (
                <tr key={s.id}>
                  <td style={tdStyle}>{new Date(s.soldAt).toLocaleString()}</td>
                  <td style={tdStyle}>
                    {s.salePrice} {s.currency}
                  </td>
                  <td style={tdStyle}>
                    {s.commissionAmount} ({s.commissionPctSnapshot}%)
                  </td>
                  <td style={tdStyle}>{s.netAmount}</td>
                  <td style={tdStyle}>
                    {s.refundedAt ? `refunded ${new Date(s.refundedAt).toLocaleString()}` : 'active'}
                  </td>
                  <td style={tdStyle}>
                    {!s.refundedAt && activeSale?.id === s.id && <RefundButton saleId={s.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section style={section}>
        <h2 style={h2}>Work timer</h2>
        <TimerControls
          pieceId={piece.id}
          isActiveOnThisPiece={activeSession?.pieceId === piece.id}
          isActiveElsewhere={!!activeSession && activeSession.pieceId !== piece.id}
          activeStartedAt={activeSession?.pieceId === piece.id ? activeSession.startedAt.toString() : null}
        />
      </section>

      <section style={section}>
        <h2 style={h2}>Materials</h2>
        {piece.status === 'in_progress' && <AddMaterialForm pieceId={piece.id} materials={allMaterials} />}
        {pieceMaterials.length === 0 ? (
          <p style={{ color: '#888' }}>None yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Material</th>
                <th style={thStyle}>Quantity</th>
                <th style={thStyle}>Captured price/unit</th>
                <th style={thStyle}>Captured at</th>
              </tr>
            </thead>
            <tbody>
              {pieceMaterials.map((pm) => (
                <tr key={pm.materialId}>
                  <td style={tdStyle}>
                    {pm.materialName} ({pm.materialUnit})
                  </td>
                  <td style={tdStyle}>{pm.quantity}</td>
                  <td style={tdStyle}>{pm.capturedPricePerUnit}</td>
                  <td style={tdStyle}>{new Date(pm.capturedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={section}>
        <h2 style={h2}>Sessions</h2>
        {sessions.length === 0 ? (
          <p style={{ color: '#888' }}>No sessions yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Started</th>
                <th style={thStyle}>Ended</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>Note</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td style={tdStyle}>{new Date(s.startedAt).toLocaleString()}</td>
                  <td style={tdStyle}>{s.endedAt ? new Date(s.endedAt).toLocaleString() : 'running'}</td>
                  <td style={tdStyle}>
                    {s.durationSeconds !== null
                      ? `${(s.durationSeconds / 3600).toFixed(2)}h`
                      : '—'}
                  </td>
                  <td style={tdStyle}>{s.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={section}>
        <h2 style={h2}>Status history</h2>
        {history.length === 0 ? (
          <p style={{ color: '#888' }}>—</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>When</th>
                <th style={thStyle}>From → To</th>
                <th style={thStyle}>Context</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td style={tdStyle}>{new Date(h.changedAt).toLocaleString()}</td>
                  <td style={tdStyle}>
                    {h.fromStatus} → {h.toStatus}
                  </td>
                  <td style={tdStyle}>
                    <code style={{ fontSize: '0.85em' }}>{h.context ? JSON.stringify(h.context) : '—'}</code>
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

const section: React.CSSProperties = { marginTop: '2rem' };
const h2: React.CSSProperties = { fontSize: '1.05rem', margin: '0 0 0.5rem' };
