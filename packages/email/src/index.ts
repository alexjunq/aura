import { loadEnv } from '@aura/config';
import type { EmailProvider } from './provider.js';
import { FakeEmailProvider } from './providers/fake.js';
import { ResendEmailProvider } from './providers/resend.js';
import { SmtpEmailProvider } from './providers/smtp.js';

export type { EmailProvider, SendEmailInput } from './provider.js';
export { FakeEmailProvider } from './providers/fake.js';

let cached: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  const env = loadEnv();
  switch (env.EMAIL_PROVIDER) {
    case 'resend':
      if (!env.EMAIL_API_KEY) throw new Error('EMAIL_API_KEY required for resend provider');
      cached = new ResendEmailProvider(env.EMAIL_API_KEY, env.EMAIL_FROM);
      return cached;
    case 'smtp':
      if (!env.EMAIL_SMTP_HOST || !env.EMAIL_SMTP_PORT) {
        throw new Error('EMAIL_SMTP_HOST and EMAIL_SMTP_PORT required for smtp provider');
      }
      cached = new SmtpEmailProvider({
        host: env.EMAIL_SMTP_HOST,
        port: env.EMAIL_SMTP_PORT,
        from: env.EMAIL_FROM,
      });
      return cached;
    case 'fake':
    default:
      cached = new FakeEmailProvider();
      return cached;
  }
}

export function resetEmailProviderCache(): void {
  cached = undefined;
}
