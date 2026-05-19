'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MaterialOption {
  id: string;
  name: string;
}

export function LinkMaterialForm({
  supplierId,
  materials,
}: {
  supplierId: string;
  materials: MaterialOption[];
}) {
  const router = useRouter();
  const [materialId, setMaterialId] = useState(materials[0]?.id ?? '');
  const [sku, setSku] = useState('');
  const [leadDays, setLeadDays] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (materials.length === 0) {
    return (
      <p style={{ color: '#888', margin: '0.5rem 0' }}>
        Add some materials first, then come back here to link them.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/suppliers/${supplierId}/materials`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          materialId,
          ...(sku ? { sku } : {}),
          ...(leadDays ? { defaultLeadTimeDays: Number(leadDays) } : {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? `failed (${res.status})`);
        return;
      }
      setSku('');
      setLeadDays('');
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
        gridTemplateColumns: '2fr 1fr 1fr auto',
        gap: '0.5rem',
        alignItems: 'end',
        marginBottom: '1rem',
      }}
    >
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#444' }}>Material</span>
        <select
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
          style={inputStyle}
        >
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <Field label="SKU" value={sku} onChange={setSku} />
      <Field label="Lead time (days)" value={leadDays} onChange={setLeadDays} />
      <button type="submit" disabled={submitting} style={primaryButton}>
        {submitting ? 'Linking…' : 'Link'}
      </button>
      {error && <p style={{ gridColumn: '1 / -1', color: 'crimson', margin: 0 }}>{error}</p>}
    </form>
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span style={{ fontSize: '0.8rem', color: '#444' }}>{props.label}</span>
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={inputStyle}
      />
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '0.45rem 0.55rem',
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: '0.95rem',
};
const primaryButton: React.CSSProperties = {
  padding: '0.5rem 0.8rem',
  background: '#222',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.95rem',
};
