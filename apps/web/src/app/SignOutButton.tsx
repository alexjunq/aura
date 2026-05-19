'use client';

import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/signin' })}
      style={{
        padding: '0.4rem 0.7rem',
        background: 'white',
        color: '#222',
        border: '1px solid #ccc',
        borderRadius: 4,
        cursor: 'pointer',
        fontSize: '0.9rem',
      }}
    >
      Sign out
    </button>
  );
}
