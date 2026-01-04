import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import type { SessionMessagesUpdatePayload } from '@/contexts/Core/Session/application/SessionProvider';

export class SessionMessagesUpdateDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'session.messages.update';

  readonly tenantId: string;
  readonly payload: SessionMessagesUpdatePayload;

  constructor(params: {
    aggregateId: string;
    tenantId: string;
    payload: SessionMessagesUpdatePayload;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, tenantId, payload, eventId, occurredOn } = params;
    super({ eventName: SessionMessagesUpdateDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.tenantId = tenantId;
    this.payload = payload;
  }

  toPrimitives(): { tenantId: string } & SessionMessagesUpdatePayload {
    return {
      tenantId: this.tenantId,
      ...this.payload,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: { tenantId: string } & SessionMessagesUpdatePayload;
  }): SessionMessagesUpdateDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new SessionMessagesUpdateDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      tenantId: attributes.tenantId,
      payload: {
        updatesCount: attributes.updatesCount ?? 0,
        updates: attributes.updates ?? [],
        source: attributes.source,
      },
    });
  }
}
