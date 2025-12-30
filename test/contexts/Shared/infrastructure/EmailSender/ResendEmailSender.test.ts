import { describe, it, expect, afterEach } from 'bun:test';
import { ResendEmailSender } from '@/contexts/Shared/infrastructure/EmailSender/ResendEmailSender';
import type Logger from '@/contexts/Shared/domain/Logger';
import type { EmailMessage } from '@/contexts/Shared/domain/EmailSender';
import { env } from '@/contexts/Shared/infrastructure/config/env';

class TestLogger implements Logger {
  public infos: string[] = [];

  debug(): void {}

  error(): void {}

  info(message: string): void {
    this.infos.push(message);
  }
}

const initialEnv = {
  resendApiKey: env.resendApiKey,
  resendFrom: env.resendFrom,
};

afterEach(() => {
  env.resendApiKey = initialEnv.resendApiKey;
  env.resendFrom = initialEnv.resendFrom;
});

describe('ResendEmailSender', () => {
  it('skips sending when missing configuration', async () => {
    env.resendApiKey = '';
    env.resendFrom = '';

    const logger = new TestLogger();
    const sender = new ResendEmailSender(logger);

    await sender.send({
      to: 'ada@example.com',
      subject: 'Hi',
      text: 'Hello',
    });

    expect(logger.infos.some((message) => message.includes('Missing RESEND_API_KEY'))).toBe(true);
  });

  it('throws when message has no content', async () => {
    env.resendFrom = 'Anna <no-reply@example.com>';

    const logger = new TestLogger();
    const sender = new ResendEmailSender(logger);
    (sender as any).client = { emails: { send: async () => ({ error: null }) } };

    const message = { to: 'ada@example.com', subject: 'Hi' } as EmailMessage;
    await expect(sender.send(message)).rejects.toThrow('Resend email requires html or text content.');
  });

  it('sends html payload via resend client', async () => {
    env.resendFrom = 'Anna <no-reply@example.com>';

    const logger = new TestLogger();
    const sender = new ResendEmailSender(logger);
    const calls: Array<Record<string, unknown>> = [];
    (sender as any).client = {
      emails: {
        send: async (payload: Record<string, unknown>) => {
          calls.push(payload);
          return { error: null };
        },
      },
    };

    await sender.send({
      to: 'ada@example.com',
      subject: 'Welcome',
      html: '<strong>Hello</strong>',
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      from: env.resendFrom,
      to: 'ada@example.com',
      subject: 'Welcome',
      html: '<strong>Hello</strong>',
    });
  });

  it('throws when resend returns an error', async () => {
    env.resendFrom = 'Anna <no-reply@example.com>';

    const logger = new TestLogger();
    const sender = new ResendEmailSender(logger);
    (sender as any).client = {
      emails: {
        send: async () => ({ error: { message: 'boom' } }),
      },
    };

    await expect(
      sender.send({
        to: 'ada@example.com',
        subject: 'Welcome',
        text: 'Hello',
      })
    ).rejects.toThrow('Resend error: boom');
  });
});
