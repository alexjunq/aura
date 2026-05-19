'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NewPieceForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/pieces', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          ...(description ? { description } : {}),
          ...(category ? { category } : {}),
          ...(location ? { currentLocationText: location } : {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? `failed (${res.status})`);
        return;
      }
      const created = (await res.json()) as { id: string };
      router.push(`/pieces/${created.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxWidth: 540 }}>
      <Field label="Title" value={title} onChange={setTitle} required />
      <Field label="Category (e.g. ring, sculpture)" value={category} onChange={setCategory} />
      <Field label="Current location (e.g. Shelf B)" value={location} onChange={setLocation} />
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <span style={{ fontSize: '0.85rem', color: '#444' }}>Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          style={{ ...inputStyle, fontFamily: 'inherit' }}
        />
      </label>
      {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
      <button type="submit" disabled={submitting} style={primaryBtn}>
        {submitting ? 'Creating…' : 'Create piece'}
      </button>
    </form>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span style={{ fontSize: '0.85rem', color: '#444' }}>{props.label}</span>
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required={props.required}
        style={inputStyle}
      />
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.6rem',
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: '1rem',
};
const primaryBtn: React.CSSProperties = {
  padding: '0.6rem 0.8rem',
  background: '#222',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '1rem',
  width: 'fit-content',
};
