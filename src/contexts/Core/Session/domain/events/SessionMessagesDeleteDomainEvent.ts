import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import type { SessionMessagesDeletePayload } from '@/contexts/Core/Session/application/SessionProvider';

export class SessionMessagesDeleteDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'session.messages.delete';

  readonly tenantId: string;
  readonly payload: SessionMessagesDeletePayload;

  constructor(params: {
    aggregateId: string;
    tenantId: string;
    payload: SessionMessagesDeletePayload;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, tenantId, payload, eventId, occurredOn } = params;
    super({ eventName: SessionMessagesDeleteDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.tenantId = tenantId;
    this.payload = payload;
  }

  toPrimitives(): { tenantId: string } & SessionMessagesDeletePayload {
    return {
      tenantId: this.tenantId,
      ...this.payload,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: { tenantId: string } & SessionMessagesDeletePayload;
  }): SessionMessagesDeleteDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new SessionMessagesDeleteDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      tenantId: attributes.tenantId,
      payload: {
        scope: attributes.scope ?? 'message',
        chatJid: attributes.chatJid,
        deletesCount: attributes.deletesCount ?? 0,
        deletes: attributes.deletes ?? [],
      },
    });
  }
}
