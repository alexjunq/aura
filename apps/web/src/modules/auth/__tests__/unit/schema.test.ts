import { describe, expect, it } from 'vitest';
import { signupSchema } from '../../schema.js';

describe('signupSchema', () => {
  it('accepts a valid signup', () => {
    const parsed = signupSchema.parse({
      email: 'Alice@Example.com',
      password: 'a-decent-password',
      name: 'Alice',
      studioName: "Alice's studio",
    });
    expect(parsed.email).toBe('alice@example.com'); // lowercased
    expect(parsed.name).toBe('Alice');
    expect(parsed.studioName).toBe("Alice's studio");
  });

  it('makes studioName optional', () => {
    const parsed = signupSchema.parse({
      email: 'a@b.com',
      password: 'a-decent-password',
      name: 'Alice',
    });
    expect(parsed.studioName).toBeUndefined();
  });

  it('rejects short passwords', () => {
    const r = signupSchema.safeParse({
      email: 'a@b.com',
      password: 'short',
      name: 'A',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === 'password')).toBe(true);
    }
  });

  it('rejects invalid email', () => {
    const r = signupSchema.safeParse({
      email: 'not-an-email',
      password: 'long-enough-pw',
      name: 'A',
    });
    expect(r.success).toBe(false);
  });

  it('rejects unknown fields (strict)', () => {
    const r = signupSchema.safeParse({
      email: 'a@b.com',
      password: 'long-enough-pw',
      name: 'A',
      tenantId: 'attempted-injection',
    });
    expect(r.success).toBe(false);
  });
});
