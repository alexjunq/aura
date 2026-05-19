'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NewMaterialForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('g');
  const [kind, setKind] = useState<'commodity' | 'gemstone' | 'wood' | 'other'>('other');
  const [commoditySymbol, setCommoditySymbol] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/materials', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          unit,
          kind,
          ...(kind === 'commodity' ? { commoditySymbol: commoditySymbol.toUpperCase() } : {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? `failed (${res.status})`);
        return;
      }
      setName('');
      setCommoditySymbol('');
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
        gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr auto',
        gap: '0.5rem',
        alignItems: 'end',
      }}
    >
      <Field label="Name" value={name} onChange={setName} required />
      <Field label="Unit" value={unit} onChange={setUnit} required />
      <Field
        label="Kind"
        value={kind}
        onChange={(v) => setKind(v as 'commodity' | 'gemstone' | 'wood' | 'other')}
        select={[
          ['other', 'other'],
          ['commodity', 'commodity'],
          ['gemstone', 'gemstone'],
          ['wood', 'wood'],
        ]}
      />
      <Field
        label="Commodity symbol"
        value={commoditySymbol}
        onChange={setCommoditySymbol}
        disabled={kind !== 'commodity'}
        placeholder="XAU"
      />
      <button type="submit" disabled={submitting} style={primaryButton}>
        {submitting ? 'Adding…' : 'Add'}
      </button>
      {error && (
        <p style={{ gridColumn: '1 / -1', color: 'crimson', margin: 0 }}>{error}</p>
      )}
    </form>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  select?: [string, string][];
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span style={{ fontSize: '0.8rem', color: '#444' }}>{props.label}</span>
      {props.select ? (
        <select
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          style={inputStyle}
          disabled={props.disabled}
        >
          {props.select.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          required={props.required}
          disabled={props.disabled}
          placeholder={props.placeholder}
          style={inputStyle}
        />
      )}
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
