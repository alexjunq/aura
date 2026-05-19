'use client';

import { useState } from 'react';
import type { TenantSettingsRow } from '@/modules/settings/repo';

export function SettingsForm({ initial }: { initial: TenantSettingsRow }) {
  const [studioName, setStudioName] = useState(initial.studioName);
  const [baseCurrency, setBaseCurrency] = useState(initial.baseCurrency);
  const [hourlyLaborRate, setHourlyLaborRate] = useState(initial.hourlyLaborRate);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ studioName, baseCurrency, hourlyLaborRate }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        setStatus(body.error?.message ?? `failed (${res.status})`);
      } else {
        setStatus('Saved.');
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'unexpected error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <Field label="Studio name" value={studioName} onChange={setStudioName} />
      <Field
        label="Base currency (ISO 4217, e.g. USD)"
        value={baseCurrency}
        onChange={(v) => setBaseCurrency(v.toUpperCase())}
        maxLength={3}
      />
      <Field
        label="Hourly labor rate (in base currency)"
        value={hourlyLaborRate}
        onChange={setHourlyLaborRate}
        inputMode="decimal"
      />
      <button type="submit" disabled={submitting} style={primaryButton}>
        {submitting ? 'Saving…' : 'Save'}
      </button>
      {status && <p style={{ margin: 0, color: status === 'Saved.' ? '#0a6' : 'crimson' }}>{status}</p>}
    </form>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  inputMode?: 'decimal' | 'numeric' | 'text';
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span style={{ fontSize: '0.85rem', color: '#444' }}>{props.label}</span>
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        maxLength={props.maxLength}
        inputMode={props.inputMode}
        style={{
          padding: '0.5rem 0.6rem',
          border: '1px solid #ccc',
          borderRadius: 4,
          fontSize: '1rem',
        }}
      />
    </label>
  );
}

const primaryButton: React.CSSProperties = {
  padding: '0.6rem 0.8rem',
  background: '#222',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '1rem',
  width: 'fit-content',
};
