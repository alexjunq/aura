import nodemailer from 'nodemailer';
import { logger } from '@aura/logger';
import type { EmailProvider, SendEmailInput } from '../provider.js';

export interface SmtpConfig {
  host: string;
  port: number;
  from: string;
  secure?: boolean;
  auth?: { user: string; pass: string };
}

/**
 * SMTP provider — used in dev against mailhog (no auth, no TLS) and as a
 * fallback option in self-hosted deployments without Resend.
 */
export class SmtpEmailProvider implements EmailProvider {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? false,
      auth: config.auth,
    });
  }

  async send(input: SendEmailInput): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
    } catch (err) {
      logger.error({ err, to: input.to }, 'smtp.send failed');
      throw err;
    }
  }
}
