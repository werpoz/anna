import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';

export class UserVerifiedDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'user.verified';

  readonly email: string;
  readonly verifiedAt: string;

  constructor(params: {
    aggregateId: string;
    email: string;
    verifiedAt: string;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, email, verifiedAt, eventId, occurredOn } = params;
    super({ eventName: UserVerifiedDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.email = email;
    this.verifiedAt = verifiedAt;
  }

  toPrimitives(): { email: string; verifiedAt: string } {
    return {
      email: this.email,
      verifiedAt: this.verifiedAt,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: { email: string; verifiedAt: string };
  }): UserVerifiedDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new UserVerifiedDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      email: attributes.email,
      verifiedAt: attributes.verifiedAt,
    });
  }
}
