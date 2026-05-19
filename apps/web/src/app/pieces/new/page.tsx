import { redirect } from 'next/navigation';
import { tryGetAuthContext } from '@/shared/auth-context';
import { PageShell } from '@/shared/layout';
import { NewPieceForm } from './NewPieceForm';

export const dynamic = 'force-dynamic';

export default async function NewPiecePage() {
  const ctx = await tryGetAuthContext();
  if (!ctx) redirect('/signin?next=/pieces/new');
  return (
    <PageShell title="New piece">
      <NewPieceForm />
    </PageShell>
  );
}
