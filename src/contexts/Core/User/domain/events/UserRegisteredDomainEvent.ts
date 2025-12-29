import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';

export class UserRegisteredDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'user.registered';

  readonly name: string;
  readonly email: string;
  readonly status: string;
  readonly verificationToken: string;
  readonly verificationCode: string;
  readonly verificationTokenExpiresAt: string;

  constructor(params: {
    aggregateId: string;
    name: string;
    email: string;
    status: string;
    verificationToken: string;
    verificationCode?: string;
    verificationTokenExpiresAt: string;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const {
      aggregateId,
      name,
      email,
      status,
      verificationToken,
      verificationCode,
      verificationTokenExpiresAt,
      eventId,
      occurredOn,
    } = params;
    super({ eventName: UserRegisteredDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.name = name;
    this.email = email;
    this.status = status;
    this.verificationToken = verificationToken;
    this.verificationCode = verificationCode ?? verificationToken;
    this.verificationTokenExpiresAt = verificationTokenExpiresAt;
  }

  toPrimitives(): {
    name: string;
    email: string;
    status: string;
    verificationToken: string;
    verificationCode: string;
    verificationTokenExpiresAt: string;
  } {
    return {
      name: this.name,
      email: this.email,
      status: this.status,
      verificationToken: this.verificationToken,
      verificationCode: this.verificationCode,
      verificationTokenExpiresAt: this.verificationTokenExpiresAt,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: {
      name: string;
      email: string;
      status: string;
      verificationToken: string;
      verificationCode?: string;
      verificationTokenExpiresAt: string;
    };
  }): UserRegisteredDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new UserRegisteredDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      name: attributes.name,
      email: attributes.email,
      status: attributes.status,
      verificationToken: attributes.verificationToken,
      verificationCode: attributes.verificationCode ?? attributes.verificationToken,
      verificationTokenExpiresAt: attributes.verificationTokenExpiresAt,
    });
  }
}
