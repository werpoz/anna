import type Logger from '@/contexts/Shared/domain/Logger';
import type { EmailSender } from '@/contexts/Shared/domain/EmailSender';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '@/contexts/Shared/infrastructure/di/tokens';
import { UserPasswordResetRequestedDomainEvent } from '@/contexts/Core/User/domain/events/UserPasswordResetRequestedDomainEvent';
import { env } from '@/contexts/Shared/infrastructure/config/env';

@injectable()
export class SendUserPasswordResetEmailOnUserPasswordResetRequested
  implements DomainEventSubscriber<UserPasswordResetRequestedDomainEvent>
{
  private readonly logger: Logger;
  private readonly emailSender: EmailSender;

  constructor(
    @inject(TOKENS.Logger) logger: Logger,
    @inject(TOKENS.EmailSender) emailSender: EmailSender
  ) {
    this.logger = logger;
    this.emailSender = emailSender;
  }

  subscribedTo(): Array<typeof UserPasswordResetRequestedDomainEvent> {
    return [UserPasswordResetRequestedDomainEvent];
  }

  async on(domainEvent: UserPasswordResetRequestedDomainEvent): Promise<void> {
    const resetUrl = `${env.appBaseUrl}/reset-password?token=${encodeURIComponent(
      domainEvent.resetToken
    )}&email=${encodeURIComponent(domainEvent.email)}`;
    const subject = 'Reset your password';
    const text = [
      `Reset token: ${domainEvent.resetToken}`,
      `Reset link: ${resetUrl}`,
      `Expires at: ${domainEvent.resetTokenExpiresAt}`,
    ].join('\n');

    await this.emailSender.send({
      to: domainEvent.email,
      subject,
      text,
      html: `<p>Reset token: <strong>${domainEvent.resetToken}</strong></p>
<p>Reset link: <a href="${resetUrl}">${resetUrl}</a></p>
<p>Expires at: ${domainEvent.resetTokenExpiresAt}</p>`,
    });

    this.logger.info(
      `[UserPasswordResetEmail] to=${domainEvent.email} token=${domainEvent.resetToken}`
    );
    this.logger.info(
      `[UserPasswordResetEmail] expiresAt=${domainEvent.resetTokenExpiresAt}`
    );
  }
}
