'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NewManualPriceForm({ materialId }: { materialId: string }) {
  const router = useRouter();
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [fxRateToBase, setFxRateToBase] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/materials/${materialId}/prices`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pricePerUnit, currency: currency.toUpperCase(), fxRateToBase }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? `failed (${res.status})`);
        return;
      }
      setPricePerUnit('');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'end' }}>
      <Field label="Price / unit" value={pricePerUnit} onChange={setPricePerUnit} required />
      <Field
        label="Currency"
        value={currency}
        onChange={(v) => setCurrency(v.toUpperCase())}
        required
        maxLength={3}
      />
      <Field label="FX → base" value={fxRateToBase} onChange={setFxRateToBase} />
      <button type="submit" disabled={submitting} style={primaryButton}>
        {submitting ? 'Saving…' : 'Record price'}
      </button>
      {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
    </form>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span style={{ fontSize: '0.8rem', color: '#444' }}>{props.label}</span>
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required={props.required}
        maxLength={props.maxLength}
        style={{
          padding: '0.45rem 0.55rem',
          border: '1px solid #ccc',
          borderRadius: 4,
          fontSize: '0.95rem',
          minWidth: 100,
        }}
      />
    </label>
  );
}

const primaryButton: React.CSSProperties = {
  padding: '0.5rem 0.8rem',
  background: '#222',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.95rem',
};
