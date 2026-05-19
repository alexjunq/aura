import * as authService from '@/modules/auth/service';

let counter = 0;

/**
 * Sign up a fresh tenant with a unique email. Returns `{ tenantId, userId, email }`.
 */
export async function seedTenant(label = 't'): Promise<{
  tenantId: string;
  userId: string;
  email: string;
}> {
  counter++;
  const email = `${label}${counter}.${Date.now()}@example.test`;
  return authService.signup({
    email,
    password: 'super-secret-password',
    name: `${label}${counter}`,
  });
}
