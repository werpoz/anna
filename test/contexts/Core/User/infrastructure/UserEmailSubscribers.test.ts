import 'reflect-metadata';
import { describe, it, expect, afterEach } from 'bun:test';
import { SendUserVerificationEmailOnUserVerificationTokenIssued } from '@/contexts/Core/User/infrastructure/SendUserVerificationEmailOnUserVerificationTokenIssued';
import { SendUserPasswordResetEmailOnUserPasswordResetRequested } from '@/contexts/Core/User/infrastructure/SendUserPasswordResetEmailOnUserPasswordResetRequested';
import { UserVerificationTokenIssuedDomainEvent } from '@/contexts/Core/User/domain/events/UserVerificationTokenIssuedDomainEvent';
import { UserPasswordResetRequestedDomainEvent } from '@/contexts/Core/User/domain/events/UserPasswordResetRequestedDomainEvent';
import type { EmailMessage, EmailSender } from '@/contexts/Shared/domain/EmailSender';
import type Logger from '@/contexts/Shared/domain/Logger';
import { env } from '@/contexts/Shared/infrastructure/config/env';

class FakeEmailSender implements EmailSender {
  public sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}

class FakeLogger implements Logger {
  public infos: string[] = [];

  debug(): void {}
  error(): void {}
  info(message: string): void {
    this.infos.push(message);
  }
}

const originalBaseUrl = env.appBaseUrl;

afterEach(() => {
  env.appBaseUrl = originalBaseUrl;
});

describe('User email subscribers', () => {
  it('sends verification email with code and link', async () => {
    env.appBaseUrl = 'http://localhost:3000';
    const emailSender = new FakeEmailSender();
    const logger = new FakeLogger();
    const subscriber = new SendUserVerificationEmailOnUserVerificationTokenIssued(logger, emailSender);

    expect(subscriber.subscribedTo()[0]?.EVENT_NAME).toBe('user.verification.token_issued');

    const event = new UserVerificationTokenIssuedDomainEvent({
      aggregateId: '11111111-1111-1111-1111-111111111111',
      email: 'ada@example.com',
      verificationToken: 'token',
      verificationCode: '123456',
      verificationTokenExpiresAt: '2024-01-01T00:00:00.000Z',
      reason: 'register',
    });

    await subscriber.on(event);

    expect(emailSender.sent).toHaveLength(1);
    const message = emailSender.sent[0]!;
    expect(message.to).toBe('ada@example.com');
    expect(message.text).toContain('123456');
    expect(message.text).toContain('verify?userId=11111111-1111-1111-1111-111111111111');
    expect(logger.infos.length).toBeGreaterThan(0);
  });

  it('sends password reset email with link', async () => {
    env.appBaseUrl = 'http://localhost:3000';
    const emailSender = new FakeEmailSender();
    const logger = new FakeLogger();
    const subscriber = new SendUserPasswordResetEmailOnUserPasswordResetRequested(logger, emailSender);

    expect(subscriber.subscribedTo()[0]?.EVENT_NAME).toBe('user.password_reset.requested');

    const event = new UserPasswordResetRequestedDomainEvent({
      aggregateId: '11111111-1111-1111-1111-111111111111',
      email: 'ada@example.com',
      resetToken: 'reset-token',
      resetTokenExpiresAt: '2024-01-01T00:00:00.000Z',
    });

    await subscriber.on(event);

    expect(emailSender.sent).toHaveLength(1);
    const message = emailSender.sent[0]!;
    expect(message.to).toBe('ada@example.com');
    expect(message.text).toContain('reset-token');
    expect(message.text).toContain('reset-password?token=reset-token');
    expect(logger.infos.length).toBeGreaterThan(0);
  });
});
