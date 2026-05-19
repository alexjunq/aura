'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ChannelOption {
  id: string;
  name: string;
  commissionPct: string;
}

/**
 * Lets the artist open a piece for sale (or reserve it) by picking a channel.
 * Hits POST /pieces/:id/status with `{to, channelId}`.
 */
export function ChannelActions({
  pieceId,
  channels,
  showOnSale,
  showReserve,
}: {
  pieceId: string;
  channels: ChannelOption[];
  showOnSale: boolean;
  showReserve: boolean;
}) {
  const router = useRouter();
  const [channelId, setChannelId] = useState(channels[0]?.id ?? '');
  const [submitting, setSubmitting] = useState<'on_sale' | 'reserved' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(to: 'on_sale' | 'reserved') {
    setError(null);
    setSubmitting(to);
    try {
      const res = await fetch(`/api/v1/pieces/${pieceId}/status`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to, channelId }),
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

  if (channels.length === 0) {
    return (
      <p style={{ color: '#888', margin: '0.5rem 0' }}>
        Add a sales channel first to open a piece for sale.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#444' }}>Channel</span>
        <select value={channelId} onChange={(e) => setChannelId(e.target.value)} style={sel}>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.commissionPct}%)
            </option>
          ))}
        </select>
      </label>
      {showOnSale && (
        <button onClick={() => go('on_sale')} disabled={submitting !== null} style={btn}>
          {submitting === 'on_sale' ? '→ on_sale…' : '→ on_sale'}
        </button>
      )}
      {showReserve && (
        <button onClick={() => go('reserved')} disabled={submitting !== null} style={btn}>
          {submitting === 'reserved' ? '→ reserved…' : '→ reserved'}
        </button>
      )}
      {error && <p style={{ width: '100%', color: 'crimson', margin: 0 }}>{error}</p>}
    </div>
  );
}

const sel: React.CSSProperties = {
  padding: '0.45rem 0.55rem',
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: '0.95rem',
};
const btn: React.CSSProperties = {
  padding: '0.45rem 0.75rem',
  background: 'white',
  color: '#222',
  border: '1px solid #ccc',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.9rem',
};
