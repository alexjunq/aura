import { auth } from '@/auth';

export interface AuthContext {
  userId: string;
  tenantId: string;
  email: string;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('unauthenticated');
    this.name = 'UnauthorizedError';
  }
}

/**
 * Resolve the authenticated user + tenant for the current request.
 *
 * Every API route handler and Server Action that touches domain data
 * MUST call this. Repos take `tenantId` as their first argument; this
 * helper is the one place where it's pulled from the session.
 *
 * Throws `UnauthorizedError` if there is no session, or the session is
 * missing tenant data (which would indicate a half-provisioned account
 * and is treated the same as unauthenticated).
 */
export async function getAuthContext(): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user?.id || !session.user.tenantId || !session.user.email) {
    throw new UnauthorizedError();
  }
  return {
    userId: session.user.id,
    tenantId: session.user.tenantId,
    email: session.user.email,
  };
}

/**
 * Same as `getAuthContext` but returns `null` instead of throwing.
 * Use in page-level guards that want to redirect rather than 401.
 */
export async function tryGetAuthContext(): Promise<AuthContext | null> {
  try {
    return await getAuthContext();
  } catch (err) {
    if (err instanceof UnauthorizedError) return null;
    throw err;
  }
}
