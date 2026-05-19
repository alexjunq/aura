import { prisma } from '@aura/db';
import type { Prisma } from '@aura/db';

/**
 * Auth repo.
 *
 * The auth module is *the* exception to the "every repo function takes
 * tenantId first" rule, because it's the path that *creates* the tenant.
 * Once a user is logged in, every other module's repo demands tenantId.
 */

export interface CreateTenantAndUserInput {
  email: string;
  hashedPassword: string;
  name: string;
  studioName: string;
}

export interface CreateTenantAndUserResult {
  userId: string;
  tenantId: string;
  email: string;
}

/**
 * Atomically create a tenant and its single user. Throws `Prisma.PrismaClientKnownRequestError`
 * with code `P2002` (unique violation) if the email is already taken.
 */
export async function createTenantAndUser(
  input: CreateTenantAndUserInput,
): Promise<CreateTenantAndUserResult> {
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: input.studioName },
    });
    const user = await tx.user.create({
      data: {
        email: input.email,
        hashedPassword: input.hashedPassword,
        name: input.name,
        tenantId: tenant.id,
      },
    });
    return { userId: user.id, tenantId: tenant.id, email: user.email };
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      tenantId: true,
      emailVerified: true,
    },
  });
}

export async function markEmailVerified(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });
}

/**
 * Find a user *within a tenant*. The shape every other module's repo
 * follows — `tenantId` first.
 *
 * Returns `null` if the email exists under a different tenant. This is the
 * primitive that the tenant-isolation safety-net test exercises.
 */
export async function findUserInTenant(
  tenantId: string,
  email: string,
): Promise<{ id: string; email: string } | null> {
  const user = await prisma.user.findFirst({
    where: { tenantId, email: email.toLowerCase() },
    select: { id: true, email: true },
  });
  return user;
}

export type AuthRepo = {
  createTenantAndUser: typeof createTenantAndUser;
  findUserByEmail: typeof findUserByEmail;
  markEmailVerified: typeof markEmailVerified;
  findUserInTenant: typeof findUserInTenant;
};

// Re-export Prisma error code for the service layer to handle uniqueness.
export type KnownPrismaError = Prisma.PrismaClientKnownRequestError;
