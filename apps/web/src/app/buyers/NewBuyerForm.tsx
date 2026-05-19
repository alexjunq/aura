'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NewBuyerForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [interestsText, setInterestsText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const interests = interestsText
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const res = await fetch('/api/v1/buyers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
          ...(instagram ? { instagram } : {}),
          interests,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? `failed (${res.status})`);
        return;
      }
      setName('');
      setEmail('');
      setPhone('');
      setInstagram('');
      setInterestsText('');
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
        gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr 1.5fr auto',
        gap: '0.5rem',
        alignItems: 'end',
      }}
    >
      <F label="Name" value={name} onChange={setName} required />
      <F label="Email" value={email} onChange={setEmail} type="email" />
      <F label="Phone" value={phone} onChange={setPhone} />
      <F label="Instagram" value={instagram} onChange={setInstagram} />
      <F label="Interests (comma-separated)" value={interestsText} onChange={setInterestsText} />
      <button type="submit" disabled={submitting} style={btn}>
        {submitting ? 'Adding…' : 'Add'}
      </button>
      {error && <p style={{ gridColumn: '1 / -1', color: 'crimson', margin: 0 }}>{error}</p>}
    </form>
  );
}

function F(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span style={{ fontSize: '0.8rem', color: '#444' }}>{props.label}</span>
      <input
        type={props.type ?? 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required={props.required}
        style={inp}
      />
    </label>
  );
}

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
