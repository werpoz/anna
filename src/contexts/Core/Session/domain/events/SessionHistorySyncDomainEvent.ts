import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import type { SessionHistorySyncPayload } from '@/contexts/Core/Session/application/SessionProvider';

export class SessionHistorySyncDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'session.history.sync';

  readonly tenantId: string;
  readonly payload: SessionHistorySyncPayload;

  constructor(params: {
    aggregateId: string;
    tenantId: string;
    payload: SessionHistorySyncPayload;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, tenantId, payload, eventId, occurredOn } = params;
    super({ eventName: SessionHistorySyncDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.tenantId = tenantId;
    this.payload = payload;
  }

  toPrimitives(): { tenantId: string } & SessionHistorySyncPayload {
    return {
      tenantId: this.tenantId,
      ...this.payload,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: { tenantId: string } & SessionHistorySyncPayload;
  }): SessionHistorySyncDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new SessionHistorySyncDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      tenantId: attributes.tenantId,
      payload: {
        syncType: attributes.syncType ?? null,
        progress: attributes.progress ?? null,
        isLatest: attributes.isLatest,
        chatsCount: attributes.chatsCount,
        contactsCount: attributes.contactsCount,
        messagesCount: attributes.messagesCount,
        messagesTruncated: attributes.messagesTruncated,
        messages: attributes.messages ?? [],
      },
    });
  }
}
