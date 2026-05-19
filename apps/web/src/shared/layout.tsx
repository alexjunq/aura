import type { ReactNode } from 'react';
import { tryGetAuthContext } from './auth-context.js';
import * as pieces from '@/modules/pieces/service';

async function ActiveTimerBanner() {
  const ctx = await tryGetAuthContext();
  if (!ctx) return null;
  const active = await pieces.activeSession(ctx.tenantId);
  if (!active) return null;
  const piece = await pieces.get(ctx.tenantId, active.pieceId).catch(() => null);
  if (!piece) return null;
  const startedAgoMin = Math.max(
    1,
    Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 60_000),
  );
  return (
    <div
      style={{
        background: '#fff8d6',
        borderBottom: '1px solid #f0d57f',
        padding: '0.5rem 1rem',
        fontSize: '0.9rem',
      }}
    >
      ⏱ Timer running on <a href={`/pieces/${piece.id}`}>{piece.title}</a> — for ~{startedAgoMin} min.
    </div>
  );
}

/**
 * Shared page chrome: optional timer banner + header (with module nav) +
 * main content area.
 */
export async function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <>
      {/* Server-rendered async banner — Next.js streams it in. */}
      <ActiveTimerBanner />
      <main style={{ maxWidth: 960, margin: '2rem auto', padding: '0 1rem' }}>
        <header style={{ marginBottom: '2rem' }}>
          <nav style={{ display: 'flex', gap: '1rem', fontSize: '0.95rem', marginBottom: '0.6rem' }}>
            <a href="/">Home</a>
            <a href="/pieces">Pieces</a>
            <a href="/materials">Materials</a>
            <a href="/suppliers">Suppliers</a>
            <a href="/channels">Channels</a>
            <a href="/settings">Settings</a>
          </nav>
          <h1 style={{ margin: 0 }}>{title}</h1>
          {subtitle && <p style={{ color: '#666', marginTop: '0.3rem' }}>{subtitle}</p>}
        </header>
        {children}
      </main>
    </>
  );
}

export const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '1rem',
  fontSize: '0.95rem',
};
export const thStyle: React.CSSProperties = {
  borderBottom: '1px solid #ddd',
  textAlign: 'left',
  padding: '0.5rem 0.4rem',
  fontWeight: 600,
};
export const tdStyle: React.CSSProperties = {
  borderBottom: '1px solid #eee',
  padding: '0.5rem 0.4rem',
};
