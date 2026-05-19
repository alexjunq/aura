import { describe, expect, it } from 'vitest';
import { prisma } from '../../index.js';

describe('database connectivity', () => {
  it('can run a trivial query', async () => {
    const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    expect(result[0]?.ok).toBe(1);
  });
});
