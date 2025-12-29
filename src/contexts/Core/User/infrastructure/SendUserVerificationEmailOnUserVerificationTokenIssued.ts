import type Logger from '@/contexts/Shared/domain/Logger';
import type { EmailSender } from '@/contexts/Shared/domain/EmailSender';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '@/contexts/Shared/infrastructure/di/tokens';
import { UserVerificationTokenIssuedDomainEvent } from '@/contexts/Core/User/domain/events/UserVerificationTokenIssuedDomainEvent';
import { env } from '@/contexts/Shared/infrastructure/config/env';

@injectable()
export class SendUserVerificationEmailOnUserVerificationTokenIssued
  implements DomainEventSubscriber<UserVerificationTokenIssuedDomainEvent>
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

  subscribedTo(): Array<typeof UserVerificationTokenIssuedDomainEvent> {
    return [UserVerificationTokenIssuedDomainEvent];
  }

  async on(domainEvent: UserVerificationTokenIssuedDomainEvent): Promise<void> {
    const verifyUrl = `${env.appBaseUrl}/verify?userId=${encodeURIComponent(
      domainEvent.aggregateId
    )}&token=${encodeURIComponent(domainEvent.verificationToken)}`;
    const subject = 'Verify your account';
    const text = [
      `Your verification code: ${domainEvent.verificationCode}`,
      `Verification link: ${verifyUrl}`,
      `Expires at: ${domainEvent.verificationTokenExpiresAt}`,
    ].join('\n');

    await this.emailSender.send({
      to: domainEvent.email,
      subject,
      text,
      html: `<p>Your verification code: <strong>${domainEvent.verificationCode}</strong></p>
<p>Verification link: <a href="${verifyUrl}">${verifyUrl}</a></p>
<p>Expires at: ${domainEvent.verificationTokenExpiresAt}</p>`,
    });

    this.logger.info(
      `[UserVerificationCode] email=${domainEvent.email} code=${domainEvent.verificationCode} reason=${domainEvent.reason}`
    );
    this.logger.info(
      `[UserVerificationEmail] to=${domainEvent.email} token=${domainEvent.verificationToken} reason=${domainEvent.reason}`
    );
  }
}
