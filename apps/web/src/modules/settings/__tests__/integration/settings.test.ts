import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@aura/db';
import { disconnect, resetDb } from '@/__tests__/helpers/db';
import * as authService from '@/modules/auth/service';
import * as settings from '../../service.js';

describe('settings integration', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  async function seedTenant(suffix: string) {
    const r = await authService.signup({
      email: `${suffix}@example.com`,
      password: 'super-secret-password',
      name: suffix,
    });
    return r;
  }

  it('returns defaults after signup', async () => {
    const { tenantId } = await seedTenant('s1');
    const s = await settings.getSettings(tenantId);
    expect(s.baseCurrency).toBe('USD');
    expect(s.hourlyLaborRate).toBe('0'); // serialized decimal
    expect(s.studioName).toBe("s1's studio");
  });

  it('updates partially', async () => {
    const { tenantId } = await seedTenant('s2');
    const updated = await settings.updateSettings(tenantId, {
      baseCurrency: 'EUR',
      hourlyLaborRate: '42.5',
    });
    expect(updated.baseCurrency).toBe('EUR');
    expect(updated.hourlyLaborRate).toBe('42.5');
    // studioName unchanged
    expect(updated.studioName).toBe("s2's studio");

    // Double-check the row.
    const row = await prisma.tenant.findUnique({ where: { id: tenantId } });
    expect(row?.baseCurrency).toBe('EUR');
  });

  it('does not leak across tenants', async () => {
    const a = await seedTenant('a');
    const b = await seedTenant('b');
    await settings.updateSettings(a.tenantId, { baseCurrency: 'EUR' });
    const sb = await settings.getSettings(b.tenantId);
    expect(sb.baseCurrency).toBe('USD'); // unaffected
  });
});
