import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';

export class SessionConnectedDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'session.status.connected';

  readonly tenantId: string;
  readonly phone: string;
  readonly connectedAt: string;

  constructor(params: {
    aggregateId: string;
    tenantId: string;
    phone: string;
    connectedAt: string;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, tenantId, phone, connectedAt, eventId, occurredOn } = params;
    super({ eventName: SessionConnectedDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.tenantId = tenantId;
    this.phone = phone;
    this.connectedAt = connectedAt;
  }

  toPrimitives(): { tenantId: string; phone: string; connectedAt: string } {
    return {
      tenantId: this.tenantId,
      phone: this.phone,
      connectedAt: this.connectedAt,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: { tenantId: string; phone: string; connectedAt: string };
  }): SessionConnectedDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new SessionConnectedDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      tenantId: attributes.tenantId,
      phone: attributes.phone,
      connectedAt: attributes.connectedAt,
    });
  }
}
