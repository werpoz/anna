import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';

export class UserVerificationTokenIssuedDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'user.verification.token_issued';

  readonly email: string;
  readonly verificationToken: string;
  readonly verificationCode: string;
  readonly verificationTokenExpiresAt: string;
  readonly reason: string;

  constructor(params: {
    aggregateId: string;
    email: string;
    verificationToken: string;
    verificationCode?: string;
    verificationTokenExpiresAt: string;
    reason: string;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, email, verificationToken, verificationCode, verificationTokenExpiresAt, reason, eventId, occurredOn } =
      params;
    super({ eventName: UserVerificationTokenIssuedDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.email = email;
    this.verificationToken = verificationToken;
    this.verificationCode = verificationCode ?? verificationToken;
    this.verificationTokenExpiresAt = verificationTokenExpiresAt;
    this.reason = reason;
  }

  toPrimitives(): {
    email: string;
    verificationToken: string;
    verificationCode: string;
    verificationTokenExpiresAt: string;
    reason: string;
  } {
    return {
      email: this.email,
      verificationToken: this.verificationToken,
      verificationCode: this.verificationCode,
      verificationTokenExpiresAt: this.verificationTokenExpiresAt,
      reason: this.reason,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: {
      email: string;
      verificationToken: string;
      verificationCode?: string;
      verificationTokenExpiresAt: string;
      reason: string;
    };
  }): UserVerificationTokenIssuedDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new UserVerificationTokenIssuedDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      email: attributes.email,
      verificationToken: attributes.verificationToken,
      verificationCode: attributes.verificationCode ?? attributes.verificationToken,
      verificationTokenExpiresAt: attributes.verificationTokenExpiresAt,
      reason: attributes.reason,
    });
  }
}
