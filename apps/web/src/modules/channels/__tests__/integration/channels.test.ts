import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { disconnect, resetDb } from '@/__tests__/helpers/db';
import { seedTenant } from '@/__tests__/helpers/seed';
import * as channels from '../../service.js';
import * as pieces from '@/modules/pieces/service';

describe('channels integration', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('CRUD + soft delete', async () => {
    const { tenantId } = await seedTenant('ch1');
    const c = await channels.create(tenantId, {
      name: 'Etsy',
      type: 'online',
      commissionPct: '6.5',
    });
    expect(c.commissionPct).toBe('6.5');
    const u = await channels.update(tenantId, c.id, { commissionPct: '7.0' });
    expect(u.commissionPct).toBe('7');
    await channels.deactivate(tenantId, c.id);
    expect(await channels.list(tenantId)).toHaveLength(0);
    expect(await channels.list(tenantId, true)).toHaveLength(1);
  });

  it('refuses cross-tenant reads', async () => {
    const a = await seedTenant('cha');
    const b = await seedTenant('chb');
    const c = await channels.create(a.tenantId, {
      name: 'A only',
      type: 'online',
      commissionPct: '0',
    });
    await expect(channels.get(b.tenantId, c.id)).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('channels — piece on_sale transition', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await disconnect();
  });

  it('on_sale transition succeeds with channel context and writes channelId into history', async () => {
    const { tenantId, userId } = await seedTenant('chos');
    const c = await channels.create(tenantId, {
      name: 'Gallery X',
      type: 'physical_store',
      commissionPct: '0',
    });
    const p = await pieces.create(tenantId, { title: 'Brooch' });
    await pieces.transitionStatus(tenantId, userId, p.id, { to: 'in_studio' });
    const moved = await pieces.transitionStatus(tenantId, userId, p.id, {
      to: 'on_sale',
      context: { channelId: c.id },
    });
    expect(moved.status).toBe('on_sale');
    const hist = await pieces.statusHistory(tenantId, p.id);
    const last = hist[0];
    expect(last?.toStatus).toBe('on_sale');
    expect(last?.context).toMatchObject({ channelId: c.id });
  });

  it('on_sale without channelId is rejected', async () => {
    const { tenantId, userId } = await seedTenant('chosx');
    const p = await pieces.create(tenantId, { title: 'X' });
    await pieces.transitionStatus(tenantId, userId, p.id, { to: 'in_studio' });
    await expect(
      pieces.transitionStatus(tenantId, userId, p.id, { to: 'on_sale' }),
    ).rejects.toMatchObject({ code: 'illegal_transition' });
  });
});
