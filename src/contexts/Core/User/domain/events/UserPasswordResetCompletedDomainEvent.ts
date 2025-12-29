import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';

export class UserPasswordResetCompletedDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'user.password_reset.completed';

  readonly email: string;
  readonly resetAt: string;

  constructor(params: {
    aggregateId: string;
    email: string;
    resetAt: string;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, email, resetAt, eventId, occurredOn } = params;
    super({ eventName: UserPasswordResetCompletedDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.email = email;
    this.resetAt = resetAt;
  }

  toPrimitives(): { email: string; resetAt: string } {
    return {
      email: this.email,
      resetAt: this.resetAt,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: { email: string; resetAt: string };
  }): UserPasswordResetCompletedDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new UserPasswordResetCompletedDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      email: attributes.email,
      resetAt: attributes.resetAt,
    });
  }
}
