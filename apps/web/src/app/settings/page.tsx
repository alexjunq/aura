import { redirect } from 'next/navigation';
import { tryGetAuthContext } from '@/shared/auth-context';
import * as settings from '@/modules/settings/service';
import { SettingsForm } from './SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const ctx = await tryGetAuthContext();
  if (!ctx) redirect('/signin?next=/settings');
  const current = await settings.getSettings(ctx.tenantId);

  return (
    <main style={{ maxWidth: 540, margin: '3rem auto', padding: '0 1rem' }}>
      <h1>Settings</h1>
      <p style={{ color: '#666' }}>Your workspace defaults.</p>
      <SettingsForm initial={current} />
    </main>
  );
}
