import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';

export class SessionCreatedDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'session.created';

  readonly tenantId: string;
  readonly status: string;
  readonly createdAt: string;

  constructor(params: {
    aggregateId: string;
    tenantId: string;
    status: string;
    createdAt: string;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, tenantId, status, createdAt, eventId, occurredOn } = params;
    super({ eventName: SessionCreatedDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.tenantId = tenantId;
    this.status = status;
    this.createdAt = createdAt;
  }

  toPrimitives(): { tenantId: string; status: string; createdAt: string } {
    return {
      tenantId: this.tenantId,
      status: this.status,
      createdAt: this.createdAt,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: { tenantId: string; status: string; createdAt: string };
  }): SessionCreatedDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new SessionCreatedDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      tenantId: attributes.tenantId,
      status: attributes.status,
      createdAt: attributes.createdAt,
    });
  }
}
