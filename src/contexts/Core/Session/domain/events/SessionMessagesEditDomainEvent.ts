import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import type { SessionMessagesEditPayload } from '@/contexts/Core/Session/application/SessionProvider';

export class SessionMessagesEditDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'session.messages.edit';

  readonly tenantId: string;
  readonly payload: SessionMessagesEditPayload;

  constructor(params: {
    aggregateId: string;
    tenantId: string;
    payload: SessionMessagesEditPayload;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, tenantId, payload, eventId, occurredOn } = params;
    super({ eventName: SessionMessagesEditDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.tenantId = tenantId;
    this.payload = payload;
  }

  toPrimitives(): { tenantId: string } & SessionMessagesEditPayload {
    return {
      tenantId: this.tenantId,
      ...this.payload,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: { tenantId: string } & SessionMessagesEditPayload;
  }): SessionMessagesEditDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new SessionMessagesEditDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      tenantId: attributes.tenantId,
      payload: {
        editsCount: attributes.editsCount ?? 0,
        edits: attributes.edits ?? [],
      },
    });
  }
}
