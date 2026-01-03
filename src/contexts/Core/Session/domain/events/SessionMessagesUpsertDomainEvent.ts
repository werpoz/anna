import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import type { SessionMessagesUpsertPayload } from '@/contexts/Core/Session/application/SessionProvider';

export class SessionMessagesUpsertDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'session.messages.upsert';

  readonly tenantId: string;
  readonly payload: SessionMessagesUpsertPayload;

  constructor(params: {
    aggregateId: string;
    tenantId: string;
    payload: SessionMessagesUpsertPayload;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, tenantId, payload, eventId, occurredOn } = params;
    super({ eventName: SessionMessagesUpsertDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.tenantId = tenantId;
    this.payload = payload;
  }

  toPrimitives(): { tenantId: string } & SessionMessagesUpsertPayload {
    return {
      tenantId: this.tenantId,
      ...this.payload,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: { tenantId: string } & SessionMessagesUpsertPayload;
  }): SessionMessagesUpsertDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new SessionMessagesUpsertDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      tenantId: attributes.tenantId,
      payload: {
        upsertType: attributes.upsertType,
        requestId: attributes.requestId,
        messagesCount: attributes.messagesCount,
        messages: attributes.messages ?? [],
      },
    });
  }
}
