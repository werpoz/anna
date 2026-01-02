import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';

export class SessionQrUpdatedDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'session.qr.updated';

  readonly tenantId: string;
  readonly qr: string;
  readonly expiresAt: string;

  constructor(params: {
    aggregateId: string;
    tenantId: string;
    qr: string;
    expiresAt: string;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, tenantId, qr, expiresAt, eventId, occurredOn } = params;
    super({ eventName: SessionQrUpdatedDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.tenantId = tenantId;
    this.qr = qr;
    this.expiresAt = expiresAt;
  }

  toPrimitives(): { tenantId: string; qr: string; expiresAt: string } {
    return {
      tenantId: this.tenantId,
      qr: this.qr,
      expiresAt: this.expiresAt,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: { tenantId: string; qr: string; expiresAt: string };
  }): SessionQrUpdatedDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new SessionQrUpdatedDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      tenantId: attributes.tenantId,
      qr: attributes.qr,
      expiresAt: attributes.expiresAt,
    });
  }
}
