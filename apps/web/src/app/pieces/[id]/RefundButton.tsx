'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RefundButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!confirm('Refund this sale? The piece will flip back to "returned".')) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/sales/${saleId}/refund`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? `failed (${res.status})`);
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <span>
      <button onClick={onClick} disabled={submitting} style={btn}>
        {submitting ? 'Refunding…' : 'Refund sale'}
      </button>
      {error && <span style={{ marginLeft: '0.5rem', color: 'crimson' }}>{error}</span>}
    </span>
  );
}

const btn: React.CSSProperties = {
  padding: '0.45rem 0.75rem',
  background: '#9a2929',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.9rem',
};
