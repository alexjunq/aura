import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { disconnect, resetDb } from '@/__tests__/helpers/db';
import * as authService from '../../service.js';
import * as authRepo from '../../repo.js';

/**
 * Safety-net test pattern: the same email belongs to two different tenants
 * (impossible in v1 because email is globally unique, but the *repo function*
 * `findUserInTenant` must reject cross-tenant reads). Every subsequent
 * module's repo will have an equivalent test asserting it filters by tenantId.
 *
 * Here we set up two tenants with two distinct emails, then prove that
 * looking up tenant A's user by tenant B's id returns null even with the
 * correct email.
 */
describe('auth — tenant isolation', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('findUserInTenant scopes lookups to the tenant', async () => {
    const a = await authService.signup({
      email: 'a@example.com',
      password: 'super-secret-password',
      name: 'A',
    });
    const b = await authService.signup({
      email: 'b@example.com',
      password: 'super-secret-password',
      name: 'B',
    });

    // Correct tenant + correct email — should resolve.
    expect((await authRepo.findUserInTenant(a.tenantId, 'a@example.com'))?.id).toBe(a.userId);
    expect((await authRepo.findUserInTenant(b.tenantId, 'b@example.com'))?.id).toBe(b.userId);

    // Cross-tenant lookups must return null.
    expect(await authRepo.findUserInTenant(a.tenantId, 'b@example.com')).toBeNull();
    expect(await authRepo.findUserInTenant(b.tenantId, 'a@example.com')).toBeNull();

    // Made-up tenant id never resolves.
    expect(await authRepo.findUserInTenant('made-up-tenant', 'a@example.com')).toBeNull();
  });
});
