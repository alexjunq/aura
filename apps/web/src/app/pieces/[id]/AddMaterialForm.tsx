'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MaterialOption {
  id: string;
  name: string;
  unit: string;
}

export function AddMaterialForm({
  pieceId,
  materials,
}: {
  pieceId: string;
  materials: MaterialOption[];
}) {
  const router = useRouter();
  const [materialId, setMaterialId] = useState(materials[0]?.id ?? '');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (materials.length === 0) {
    return (
      <p style={{ color: '#888', margin: '0.5rem 0' }}>
        Add some materials first (and record at least one price for each), then come back here.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/pieces/${pieceId}/materials`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ materialId, quantity }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? `failed (${res.status})`);
        return;
      }
      setQuantity('');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const selected = materials.find((m) => m.id === materialId);

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr auto',
        gap: '0.5rem',
        alignItems: 'end',
        marginBottom: '1rem',
      }}
    >
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#444' }}>Material</span>
        <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} style={inputStyle}>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.unit})
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#444' }}>Quantity ({selected?.unit ?? ''})</span>
        <input
          type="text"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          style={inputStyle}
        />
      </label>
      <button type="submit" disabled={submitting} style={primaryBtn}>
        {submitting ? 'Adding…' : 'Add material'}
      </button>
      {error && <p style={{ gridColumn: '1 / -1', color: 'crimson', margin: 0 }}>{error}</p>}
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '0.45rem 0.55rem',
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: '0.95rem',
};
const primaryBtn: React.CSSProperties = {
  padding: '0.5rem 0.8rem',
  background: '#222',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.95rem',
};
