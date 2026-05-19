'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function SigninPage() {
  return (
    <Suspense fallback={<main style={{ padding: '4rem' }}>Loading…</main>}>
      <SigninPageInner />
    </Suspense>
  );
}

function SigninPageInner() {
  const params = useSearchParams();
  const signedUp = params.get('signedUp') === '1';
  const errorParam = params.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState<'password' | 'magic' | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onPasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    setSubmitting('password');
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setLocalError('Incorrect email or password.');
        return;
      }
      window.location.href = '/';
    } finally {
      setSubmitting(null);
    }
  }

  async function onMagicLinkSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    setSubmitting('magic');
    try {
      await signIn('nodemailer', { email, callbackUrl: '/', redirect: true });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>Sign in</h1>
      {signedUp && (
        <p style={{ background: '#e7f7e7', padding: '0.6rem', borderRadius: 4 }}>
          Account created. Sign in below.
        </p>
      )}
      {errorParam && (
        <p style={{ background: '#fde7e7', padding: '0.6rem', borderRadius: 4 }}>
          Sign-in failed: {errorParam}
        </p>
      )}

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={sectionHeading}>Email + password</h2>
        <form onSubmit={onPasswordSubmit} style={formStack}>
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
          />
          <button
            type="submit"
            disabled={submitting !== null}
            style={primaryButton}
          >
            {submitting === 'password' ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>

      <hr style={dividerStyle} />

      <section>
        <h2 style={sectionHeading}>Email me a sign-in link</h2>
        <form onSubmit={onMagicLinkSubmit} style={formStack}>
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <button
            type="submit"
            disabled={submitting !== null}
            style={secondaryButton}
          >
            {submitting === 'magic' ? 'Sending…' : 'Send link'}
          </button>
        </form>
      </section>

      <hr style={dividerStyle} />

      <section>
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/' })}
          style={secondaryButton}
        >
          Continue with Google
        </button>
      </section>

      {localError && (
        <p style={{ color: 'crimson', marginTop: '1rem' }}>{localError}</p>
      )}

      <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '1.5rem' }}>
        Don&apos;t have an account? <a href="/signup">Sign up</a>.
      </p>
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
        style={inputStyle}
      />
    </label>
  );
}

const formStack: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
};
const sectionHeading: React.CSSProperties = { margin: '0 0 0.5rem', fontSize: '1rem' };
const dividerStyle: React.CSSProperties = { margin: '1.5rem 0', border: 0, borderTop: '1px solid #eee' };
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
const secondaryButton: React.CSSProperties = {
  padding: '0.6rem 0.8rem',
  background: 'white',
  color: '#222',
  border: '1px solid #ccc',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '1rem',
};
