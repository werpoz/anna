import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';

export class UserPasswordResetRequestedDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'user.password_reset.requested';

  readonly email: string;
  readonly resetToken: string;
  readonly resetTokenExpiresAt: string;

  constructor(params: {
    aggregateId: string;
    email: string;
    resetToken: string;
    resetTokenExpiresAt: string;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, email, resetToken, resetTokenExpiresAt, eventId, occurredOn } = params;
    super({ eventName: UserPasswordResetRequestedDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.email = email;
    this.resetToken = resetToken;
    this.resetTokenExpiresAt = resetTokenExpiresAt;
  }

  toPrimitives(): { email: string; resetToken: string; resetTokenExpiresAt: string } {
    return {
      email: this.email,
      resetToken: this.resetToken,
      resetTokenExpiresAt: this.resetTokenExpiresAt,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: { email: string; resetToken: string; resetTokenExpiresAt: string };
  }): UserPasswordResetRequestedDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new UserPasswordResetRequestedDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      email: attributes.email,
      resetToken: attributes.resetToken,
      resetTokenExpiresAt: attributes.resetTokenExpiresAt,
    });
  }
}
