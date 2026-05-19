import { hash } from 'bcryptjs';
import { Prisma } from '@aura/db';
import { logger } from '@aura/logger';
import { getEmailProvider } from '@aura/email';
import { loadEnv } from '@aura/config';
import * as repo from './repo.js';
import type { SignupInput, SignupResponse } from './schema.js';

const BCRYPT_ROUNDS = 12;

export class EmailAlreadyTakenError extends Error {
  constructor(email: string) {
    super(`email already registered: ${email}`);
    this.name = 'EmailAlreadyTakenError';
  }
}

export async function signup(input: SignupInput): Promise<SignupResponse> {
  const hashedPassword = await hash(input.password, BCRYPT_ROUNDS);
  let created;
  try {
    created = await repo.createTenantAndUser({
      email: input.email,
      hashedPassword,
      name: input.name,
      studioName: input.studioName ?? `${input.name}'s studio`,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new EmailAlreadyTakenError(input.email);
    }
    throw err;
  }

  logger.info({ userId: created.userId, tenantId: created.tenantId }, 'tenant + user created');

  await sendWelcomeEmail(created.email);

  return created;
}

/**
 * Send the welcome / verification-prompt email. Magic-link verification
 * itself is handled by Auth.js's Email provider when the user opts to
 * "send me a sign-in link" — this email just nudges them to do so.
 */
export async function sendWelcomeEmail(email: string): Promise<void> {
  const env = loadEnv();
  const provider = getEmailProvider();
  await provider.send({
    to: email,
    subject: 'Welcome to AURA — please verify your email',
    text: `Welcome to AURA!\n\nVisit ${env.NEXTAUTH_URL}/signin to verify and sign in.`,
  });
}
