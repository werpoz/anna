import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';

export class UserCreatedDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'user.created';

  readonly name: string;
  readonly email: string;

  constructor(params: {
    aggregateId: string;
    name: string;
    email: string;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, name, email, eventId, occurredOn } = params;
    super({ eventName: UserCreatedDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.name = name;
    this.email = email;
  }

  toPrimitives(): { name: string; email: string } {
    return {
      name: this.name,
      email: this.email,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: { name: string; email: string };
  }): UserCreatedDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new UserCreatedDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      name: attributes.name,
      email: attributes.email,
    });
  }
}
