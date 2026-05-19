import type { EmailProvider, SendEmailInput } from '../provider.js';

/**
 * In-memory provider used in tests. Records every email sent.
 */
export class FakeEmailProvider implements EmailProvider {
  readonly sent: SendEmailInput[] = [];

  async send(input: SendEmailInput): Promise<void> {
    this.sent.push(input);
  }

  reset(): void {
    this.sent.length = 0;
  }
}
