import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { disconnect, resetDb } from '@/__tests__/helpers/db';
import { seedTenant } from '@/__tests__/helpers/seed';
import * as buyers from '../../service.js';

describe('buyers integration', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('CRUD round-trip + interests array', async () => {
    const { tenantId } = await seedTenant('by1');
    const b = await buyers.create(tenantId, {
      name: 'Alex',
      email: 'alex@example.com',
      interests: ['rings', 'silver'],
    });
    expect(b.interests).toEqual(['rings', 'silver']);
    const list = await buyers.list(tenantId);
    expect(list).toHaveLength(1);
    const u = await buyers.update(tenantId, b.id, { phone: '+1 555' });
    expect(u.phone).toBe('+1 555');
  });

  it('soft-delete via retiredAt', async () => {
    const { tenantId } = await seedTenant('by2');
    const b = await buyers.create(tenantId, { name: 'X', interests: [] });
    await buyers.retire(tenantId, b.id);
    expect(await buyers.list(tenantId)).toHaveLength(0);
    expect(await buyers.list(tenantId, { includeRetired: true })).toHaveLength(1);
  });

  it('interactions are returned newest-first', async () => {
    const { tenantId, userId } = await seedTenant('by3');
    const b = await buyers.create(tenantId, { name: 'Y', interests: [] });
    await buyers.createInteraction(tenantId, b.id, userId, {
      occurredAt: new Date('2026-01-01T00:00:00Z'),
      kind: 'meeting',
      summary: 'Met at gallery',
    });
    await buyers.createInteraction(tenantId, b.id, userId, {
      occurredAt: new Date('2026-03-01T00:00:00Z'),
      kind: 'message',
      summary: 'Inquired about ring',
    });
    const list = await buyers.listInteractions(tenantId, b.id);
    expect(list).toHaveLength(2);
    expect(list[0]?.summary).toBe('Inquired about ring');
  });

  it('refuses cross-tenant interaction writes', async () => {
    const a = await seedTenant('byiso-a');
    const c = await seedTenant('byiso-b');
    const bA = await buyers.create(a.tenantId, { name: 'A buyer', interests: [] });
    await expect(
      buyers.createInteraction(c.tenantId, bA.id, c.userId, {
        occurredAt: new Date(),
        kind: 'note',
        summary: 'Hi from B',
      }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});
