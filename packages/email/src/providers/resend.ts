import { Resend } from 'resend';
import { logger } from '@aura/logger';
import type { EmailProvider, SendEmailInput } from '../provider.js';

export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.client = new Resend(apiKey);
  }

  async send(input: SendEmailInput): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    if (error) {
      logger.error({ err: error, to: input.to }, 'resend.send failed');
      throw new Error(`Resend send failed: ${error.message}`);
    }
  }
}
