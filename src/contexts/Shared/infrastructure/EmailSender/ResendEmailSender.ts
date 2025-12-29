import { Resend, type CreateEmailOptions } from 'resend';
import type Logger from '@/contexts/Shared/domain/Logger';
import type { EmailMessage, EmailSender } from '@/contexts/Shared/domain/EmailSender';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '@/contexts/Shared/infrastructure/di/tokens';

@injectable()
export class ResendEmailSender implements EmailSender {
  private readonly logger: Logger;
  private readonly client: Resend | null;

  constructor(@inject(TOKENS.Logger) logger: Logger) {
    this.logger = logger;
    this.client = env.resendApiKey ? new Resend(env.resendApiKey) : null;
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.client || !env.resendFrom) {
      this.logger.info(
        '[ResendEmailSender] Missing RESEND_API_KEY or RESEND_FROM, skipping email send.'
      );
      return;
    }

    const base = {
      from: env.resendFrom,
      to: message.to,
      subject: message.subject,
    };
    const html = message.html;
    const text = message.text;

    if (!html && !text) {
      throw new Error('Resend email requires html or text content.');
    }

    const payload: CreateEmailOptions = html
      ? { ...base, html, ...(text ? { text } : {}) }
      : { ...base, text: text! };

    const { error } = await this.client.emails.send(payload);

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  }
}
