'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function TimerControls({
  pieceId,
  isActiveOnThisPiece,
  isActiveElsewhere,
  activeStartedAt,
}: {
  pieceId: string;
  isActiveOnThisPiece: boolean;
  isActiveElsewhere: boolean;
  activeStartedAt: string | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<'start' | 'stop' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function action(op: 'start' | 'stop') {
    setError(null);
    setSubmitting(op);
    try {
      const res = await fetch(`/api/v1/pieces/${pieceId}/sessions/${op}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? `failed (${res.status})`);
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(null);
    }
  }

  if (isActiveOnThisPiece) {
    const started = activeStartedAt ? new Date(activeStartedAt) : null;
    const ago = started ? Math.max(1, Math.floor((Date.now() - started.getTime()) / 60_000)) : null;
    return (
      <div>
        <p style={{ margin: '0 0 0.5rem' }}>
          ⏱ Running for ~{ago} min — started {started?.toLocaleTimeString()}.
        </p>
        <button onClick={() => action('stop')} disabled={submitting !== null} style={dangerBtn}>
          {submitting === 'stop' ? 'Stopping…' : 'Stop timer'}
        </button>
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
      </div>
    );
  }

  if (isActiveElsewhere) {
    return (
      <p style={{ color: '#a85' }}>
        A timer is already running on another piece. Stop it before starting one here.
      </p>
    );
  }

  return (
    <div>
      <button onClick={() => action('start')} disabled={submitting !== null} style={primaryBtn}>
        {submitting === 'start' ? 'Starting…' : 'Start timer'}
      </button>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: '0.5rem 0.8rem',
  background: '#222',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.95rem',
};
const dangerBtn: React.CSSProperties = { ...primaryBtn, background: '#9a2929' };
