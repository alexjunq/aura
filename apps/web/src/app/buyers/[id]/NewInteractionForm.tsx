'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NewInteractionForm({ buyerId }: { buyerId: string }) {
  const router = useRouter();
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [kind, setKind] = useState<'meeting' | 'message' | 'inquiry' | 'note' | 'other'>('note');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/buyers/${buyerId}/interactions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          occurredAt: new Date(occurredAt).toISOString(),
          kind,
          summary,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? `failed (${res.status})`);
        return;
      }
      setSummary('');
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
        gridTemplateColumns: '1.2fr 1fr 3fr auto',
        gap: '0.5rem',
        alignItems: 'end',
        marginBottom: '1rem',
      }}
    >
      <label style={fs}>
        <span style={lb}>When</span>
        <input
          type="datetime-local"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
          style={inp}
          required
        />
      </label>
      <label style={fs}>
        <span style={lb}>Kind</span>
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} style={inp}>
          <option value="meeting">meeting</option>
          <option value="message">message</option>
          <option value="inquiry">inquiry</option>
          <option value="note">note</option>
          <option value="other">other</option>
        </select>
      </label>
      <label style={fs}>
        <span style={lb}>Summary</span>
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          style={inp}
          required
        />
      </label>
      <button type="submit" disabled={submitting} style={btn}>
        {submitting ? 'Saving…' : 'Add'}
      </button>
      {error && <p style={{ gridColumn: '1 / -1', color: 'crimson', margin: 0 }}>{error}</p>}
    </form>
  );
}

const fs: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.2rem' };
const lb: React.CSSProperties = { fontSize: '0.8rem', color: '#444' };
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
