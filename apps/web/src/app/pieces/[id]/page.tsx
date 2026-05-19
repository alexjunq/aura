import { redirect, notFound } from 'next/navigation';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as pieces from '@/modules/pieces/service';
import * as materials from '@/modules/materials/service';
import * as channelsService from '@/modules/channels/service';
import { PageShell, tableStyle, tdStyle, thStyle } from '@/shared/layout';
import { TimerControls } from './TimerControls';
import { AddMaterialForm } from './AddMaterialForm';
import { StatusActions } from './StatusActions';
import { ChannelActions } from './ChannelActions';

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
    activeSession,
    costBase,
  ] = await Promise.all([
    pieces.listMaterials(ctx.tenantId, id),
    pieces.listSessions(ctx.tenantId, id),
    pieces.statusHistory(ctx.tenantId, id),
    pieces.totalSessionSeconds(ctx.tenantId, id),
    materials.list(ctx.tenantId),
    channelsService.list(ctx.tenantId),
    pieces.activeSession(ctx.tenantId),
    pieces.materialsCostBase(ctx.tenantId, id),
  ]);
  const totalHours = (totalSec / 3600).toFixed(2);

  return (
    <PageShell title={piece.title} subtitle={`Status: ${piece.status} · Hours: ${totalHours} · Materials cost: ${costBase} (base)`}>
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
