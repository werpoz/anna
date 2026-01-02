import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';

export class SessionDisconnectedDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'session.status.disconnected';

  readonly tenantId: string;
  readonly reason: string;
  readonly disconnectedAt: string;

  constructor(params: {
    aggregateId: string;
    tenantId: string;
    reason: string;
    disconnectedAt: string;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, tenantId, reason, disconnectedAt, eventId, occurredOn } = params;
    super({ eventName: SessionDisconnectedDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.tenantId = tenantId;
    this.reason = reason;
    this.disconnectedAt = disconnectedAt;
  }

  toPrimitives(): { tenantId: string; reason: string; disconnectedAt: string } {
    return {
      tenantId: this.tenantId,
      reason: this.reason,
      disconnectedAt: this.disconnectedAt,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: { tenantId: string; reason: string; disconnectedAt: string };
  }): SessionDisconnectedDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new SessionDisconnectedDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      tenantId: attributes.tenantId,
      reason: attributes.reason,
      disconnectedAt: attributes.disconnectedAt,
    });
  }
}
