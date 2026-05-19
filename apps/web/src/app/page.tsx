import { redirect } from 'next/navigation';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as settings from '@/modules/settings/service';
import { SignOutButton } from './SignOutButton';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const ctx = await tryGetAuthContext();
  if (!ctx) redirect('/signin');

  const studio = await settings.getSettings(ctx.tenantId);

  return (
    <main style={{ maxWidth: 720, margin: '3rem auto', padding: '0 1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>AURA</h1>
        <SignOutButton />
      </header>

      <p style={{ marginTop: '1rem' }}>
        Welcome, <strong>{ctx.email}</strong>.
      </p>
      <p style={{ color: '#666' }}>
        Studio: <em>{studio.studioName}</em> &middot; base currency {studio.baseCurrency} &middot;
        labor rate {studio.hourlyLaborRate}/hr.
      </p>

      <nav style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1rem' }}>Phase 1 ready · later phases land here:</h2>
        <ul style={{ lineHeight: 1.8 }}>
          <li><a href="/settings">Settings</a></li>
          <li style={{ color: '#aaa' }}>Pieces (Phase 3)</li>
          <li style={{ color: '#aaa' }}>Materials &amp; suppliers (Phase 2)</li>
          <li style={{ color: '#aaa' }}>Sales channels (Phase 4)</li>
          <li style={{ color: '#aaa' }}>Buyers (Phase 5)</li>
          <li style={{ color: '#aaa' }}>Sales (Phase 6)</li>
          <li style={{ color: '#aaa' }}>Reports (Phase 8)</li>
        </ul>
      </nav>
    </main>
  );
}
