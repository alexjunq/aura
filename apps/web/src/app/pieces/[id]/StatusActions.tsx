'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PieceSummary {
  id: string;
  status:
    | 'in_progress'
    | 'in_studio'
    | 'reserved'
    | 'on_sale'
    | 'sold'
    | 'returned'
    | 'lost_damaged';
}

// Allowed direct targets per status (mirrors state machine; spec §5).
const LEGAL_DIRECT: Record<PieceSummary['status'], string[]> = {
  in_progress: ['in_studio', 'lost_damaged'],
  in_studio: ['lost_damaged'], // on_sale/reserved require a channel; sold flows via sale.recordSale
  reserved: ['in_studio', 'lost_damaged'],
  on_sale: ['in_studio', 'reserved', 'lost_damaged'],
  sold: [],
  returned: ['in_studio', 'lost_damaged'],
  lost_damaged: [],
};

export function StatusActions({ piece }: { piece: PieceSummary }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const legal = LEGAL_DIRECT[piece.status];

  async function transition(to: string) {
    setSubmitting(to);
    setError(null);
    try {
      const res = await fetch(`/api/v1/pieces/${piece.id}/status`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to }),
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

  if (legal.length === 0) {
    return <p style={{ color: '#888' }}>No direct status changes available from {piece.status}.</p>;
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
      {legal.map((to) => (
        <button
          key={to}
          type="button"
          onClick={() => transition(to)}
          disabled={submitting !== null}
          style={btn}
        >
          {submitting === to ? `→ ${to}…` : `→ ${to}`}
        </button>
      ))}
      {piece.status === 'in_studio' && (
        <span style={{ color: '#888', fontSize: '0.85em' }}>
          (To put on sale or reserve, link via a channel — Phase 4.)
        </span>
      )}
      {error && (
        <p style={{ width: '100%', color: 'crimson', margin: 0 }}>{error}</p>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: '0.45rem 0.75rem',
  background: 'white',
  color: '#222',
  border: '1px solid #ccc',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.9rem',
};
