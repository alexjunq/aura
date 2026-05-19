import type { ReactNode } from 'react';

/**
 * Shared page chrome: header (with module nav) + main content area. Phase 1
 * had inline styling on the home page; subsequent module pages reuse this so
 * navigation is consistent.
 */
export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main style={{ maxWidth: 960, margin: '2rem auto', padding: '0 1rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <nav style={{ display: 'flex', gap: '1rem', fontSize: '0.95rem', marginBottom: '0.6rem' }}>
          <a href="/">Home</a>
          <a href="/materials">Materials</a>
          <a href="/suppliers">Suppliers</a>
          <a href="/settings">Settings</a>
        </nav>
        <h1 style={{ margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ color: '#666', marginTop: '0.3rem' }}>{subtitle}</p>}
      </header>
      {children}
    </main>
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
