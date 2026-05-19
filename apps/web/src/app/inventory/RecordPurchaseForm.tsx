'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Option {
  id: string;
  label: string;
}

export function RecordPurchaseForm({
  materials,
  suppliers,
  baseCurrency,
}: {
  materials: Option[];
  suppliers: Option[];
  baseCurrency: string;
}) {
  const router = useRouter();
  const [materialId, setMaterialId] = useState(materials[0]?.id ?? '');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [fxRateToBase, setFxRateToBase] = useState('1');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (materials.length === 0) {
    return (
      <p style={empty}>
        Add at least one material first.
      </p>
    );
  }
  if (suppliers.length === 0) {
    return (
      <p style={empty}>
        Add at least one supplier first — every purchase must reference one.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/inventory/purchases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          materialId,
          supplierId,
          quantity,
          unitCost,
          currency: currency.toUpperCase(),
          fxRateToBase,
          ...(reference ? { reference } : {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? `failed (${res.status})`);
        return;
      }
      setQuantity('');
      setUnitCost('');
      setReference('');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={grid}>
      <Sel label="Material" value={materialId} onChange={setMaterialId} options={materials} />
      <Sel label="Supplier" value={supplierId} onChange={setSupplierId} options={suppliers} />
      <In label="Quantity" value={quantity} onChange={setQuantity} required />
      <In label="Unit cost" value={unitCost} onChange={setUnitCost} required />
      <In label="Currency" value={currency} onChange={(v) => setCurrency(v.toUpperCase())} maxLength={3} />
      <In label="FX → base" value={fxRateToBase} onChange={setFxRateToBase} />
      <In label="Reference (PO #, invoice #)" value={reference} onChange={setReference} />
      <button type="submit" disabled={submitting} style={btn}>
        {submitting ? 'Recording…' : 'Record purchase'}
      </button>
      {error && <p style={errorStyle}>{error}</p>}
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

function In(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  maxLength?: number;
}) {
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

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '0.5rem',
  alignItems: 'end',
};
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
  height: 'fit-content',
};
const empty: React.CSSProperties = { color: '#888' };
const errorStyle: React.CSSProperties = { gridColumn: '1 / -1', color: 'crimson', margin: 0 };
