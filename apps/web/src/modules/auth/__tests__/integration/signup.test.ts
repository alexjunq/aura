import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@aura/db';
import { disconnect, resetDb } from '@/__tests__/helpers/db';
import * as authService from '../../service.js';
import { EmailAlreadyTakenError } from '../../service.js';
import * as authRepo from '../../repo.js';
import { signupSchema } from '../../schema.js';

describe('auth.signup integration', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('atomically creates a tenant and a user', async () => {
    const result = await authService.signup({
      email: 'alice@example.com',
      password: 'super-secret-password',
      name: 'Alice',
      studioName: "Alice's studio",
    });

    expect(result.userId).toBeTruthy();
    expect(result.tenantId).toBeTruthy();
    expect(result.email).toBe('alice@example.com');

    const tenant = await prisma.tenant.findUnique({ where: { id: result.tenantId } });
    expect(tenant?.name).toBe("Alice's studio");
    expect(tenant?.baseCurrency).toBe('USD');

    const user = await prisma.user.findUnique({ where: { id: result.userId } });
    expect(user?.tenantId).toBe(result.tenantId);
    expect(user?.email).toBe('alice@example.com');
    expect(user?.hashedPassword).toBeTruthy();
    expect(user?.hashedPassword).not.toBe('super-secret-password'); // hashed, not plain
  });

  it('uses "<name>\'s studio" when studioName is omitted', async () => {
    const result = await authService.signup({
      email: 'bob@example.com',
      password: 'super-secret-password',
      name: 'Bob',
    });
    const tenant = await prisma.tenant.findUnique({ where: { id: result.tenantId } });
    expect(tenant?.name).toBe("Bob's studio");
  });

  it('rejects duplicate email with EmailAlreadyTakenError and leaves nothing behind', async () => {
    await authService.signup({
      email: 'carol@example.com',
      password: 'super-secret-password',
      name: 'Carol',
    });
    const tenantCountBefore = await prisma.tenant.count();

    await expect(
      authService.signup({
        email: 'carol@example.com',
        password: 'a-different-password',
        name: 'Carol Again',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyTakenError);

    // Tenant count should NOT have changed — the transaction rolled back.
    expect(await prisma.tenant.count()).toBe(tenantCountBefore);
  });

  it('normalizes email to lowercase (via schema)', async () => {
    // Real callers route input through the schema first; we mimic that.
    const parsed = signupSchema.parse({
      email: 'Mixed.Case@Example.COM',
      password: 'super-secret-password',
      name: 'M',
    });
    const result = await authService.signup(parsed);
    expect(result.email).toBe('mixed.case@example.com');
    const found = await authRepo.findUserByEmail('MIXED.CASE@EXAMPLE.COM');
    expect(found?.id).toBe(result.userId);
  });
});
