'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NewChannelForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<'online' | 'physical_store' | 'event' | 'direct'>('online');
  const [commissionPct, setCommissionPct] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/channels', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, type, commissionPct }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? `failed (${res.status})`);
        return;
      }
      setName('');
      setCommissionPct('0');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1.2fr 1fr auto',
        gap: '0.5rem',
        alignItems: 'end',
      }}
    >
      <label style={fieldStyle}>
        <span style={lbl}>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required style={inp} />
      </label>
      <label style={fieldStyle}>
        <span style={lbl}>Type</span>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} style={inp}>
          <option value="online">online</option>
          <option value="physical_store">physical_store</option>
          <option value="event">event</option>
          <option value="direct">direct</option>
        </select>
      </label>
      <label style={fieldStyle}>
        <span style={lbl}>Commission %</span>
        <input
          value={commissionPct}
          onChange={(e) => setCommissionPct(e.target.value)}
          style={inp}
        />
      </label>
      <button type="submit" disabled={submitting} style={btn}>
        {submitting ? 'Adding…' : 'Add'}
      </button>
      {error && <p style={{ gridColumn: '1 / -1', color: 'crimson', margin: 0 }}>{error}</p>}
    </form>
  );
}

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.2rem' };
const lbl: React.CSSProperties = { fontSize: '0.8rem', color: '#444' };
const inp: React.CSSProperties = {
  padding: '0.45rem 0.55rem',
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: '0.95rem',
};
const btn: React.CSSProperties = {
  padding: '0.5rem 0.8rem',
  background: '#222',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.95rem',
};
