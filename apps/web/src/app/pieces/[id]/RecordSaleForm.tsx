'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Option {
  id: string;
  label: string;
}

export function RecordSaleForm({
  pieceId,
  buyers,
  channels,
  baseCurrency,
}: {
  pieceId: string;
  buyers: Option[];
  channels: Option[];
  baseCurrency: string;
}) {
  const router = useRouter();
  const [buyerId, setBuyerId] = useState(buyers[0]?.id ?? '');
  const [channelId, setChannelId] = useState(channels[0]?.id ?? '');
  const [salePrice, setSalePrice] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [fxRateToBase, setFxRateToBase] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (buyers.length === 0) {
    return (
      <p style={{ color: '#888' }}>
        Add a buyer first to record a sale.
      </p>
    );
  }
  if (channels.length === 0) {
    return (
      <p style={{ color: '#888' }}>
        Add a sales channel first to record a sale.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/sales', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pieceId,
          buyerId,
          channelId,
          salePrice,
          currency: currency.toUpperCase(),
          fxRateToBase,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? `failed (${res.status})`);
        return;
      }
      setSalePrice('');
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
        gridTemplateColumns: '1.3fr 1.3fr 1fr 0.8fr 0.8fr auto',
        gap: '0.5rem',
        alignItems: 'end',
      }}
    >
      <Sel label="Buyer" value={buyerId} onChange={setBuyerId} options={buyers} />
      <Sel label="Channel" value={channelId} onChange={setChannelId} options={channels} />
      <In label="Sale price" value={salePrice} onChange={setSalePrice} required />
      <In label="Currency" value={currency} onChange={(v) => setCurrency(v.toUpperCase())} maxLength={3} />
      <In label="FX → base" value={fxRateToBase} onChange={setFxRateToBase} />
      <button type="submit" disabled={submitting} style={primaryBtn}>
        {submitting ? 'Recording…' : 'Record sale'}
      </button>
      {error && <p style={{ gridColumn: '1 / -1', color: 'crimson', margin: 0 }}>{error}</p>}
    </form>
  );
}

function Sel(props: { label: string; value: string; onChange: (v: string) => void; options: Option[] }) {
  return (
    <label style={fs}>
      <span style={lb}>{props.label}</span>
      <select value={props.value} onChange={(e) => props.onChange(e.target.value)} style={inp}>
        {props.options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function In(props: { label: string; value: string; onChange: (v: string) => void; required?: boolean; maxLength?: number }) {
  return (
    <label style={fs}>
      <span style={lb}>{props.label}</span>
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required={props.required}
        maxLength={props.maxLength}
        style={inp}
      />
    </label>
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
const primaryBtn: React.CSSProperties = {
  padding: '0.5rem 0.8rem',
  background: '#222',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.95rem',
};
