'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Option {
  id: string;
  label: string;
}

export function RecordAdjustmentForm({ materials }: { materials: Option[] }) {
  const router = useRouter();
  const [materialId, setMaterialId] = useState(materials[0]?.id ?? '');
  const [quantity, setQuantity] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (materials.length === 0) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/inventory/adjustments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ materialId, quantity, reference }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? `failed (${res.status})`);
        return;
      }
      setQuantity('');
      setReference('');
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
        gridTemplateColumns: '2fr 1fr 2fr auto',
        gap: '0.5rem',
        alignItems: 'end',
      }}
    >
      <label style={fs}>
        <span style={lb}>Material</span>
        <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} style={inp}>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label style={fs}>
        <span style={lb}>Quantity (signed)</span>
        <input
          type="text"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="-50 or 25"
          required
          style={inp}
        />
      </label>
      <label style={fs}>
        <span style={lb}>Reason</span>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="breakage / re-count / sample"
          required
          style={inp}
        />
      </label>
      <button type="submit" disabled={submitting} style={btn}>
        {submitting ? 'Saving…' : 'Adjust'}
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
