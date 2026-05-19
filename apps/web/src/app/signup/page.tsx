'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [studioName, setStudioName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          ...(studioName ? { studioName } : {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? `signup failed (${res.status})`);
        return;
      }
      router.push('/signin?signedUp=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unexpected error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>Sign up</h1>
      <p style={{ color: '#666' }}>Create your AURA workspace.</p>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Field
          label="Your name"
          value={name}
          onChange={setName}
          autoComplete="name"
          required
        />
        <Field
          label="Studio name (optional)"
          value={studioName}
          onChange={setStudioName}
          autoComplete="organization"
        />
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <Field
          label="Password (10+ characters)"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={10}
          required
        />
        {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
        <button type="submit" disabled={submitting} style={primaryButton}>
          {submitting ? 'Creating…' : 'Sign up'}
        </button>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>
          Already have an account? <a href="/signin">Sign in</a>.
        </p>
      </form>
    </main>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span style={{ fontSize: '0.85rem', color: '#444' }}>{props.label}</span>
      <input
        type={props.type ?? 'text'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        required={props.required}
        minLength={props.minLength}
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

const primaryButton: React.CSSProperties = {
  padding: '0.6rem 0.8rem',
  background: '#222',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '1rem',
};
