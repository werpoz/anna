import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import type { SessionMessagesMediaPayload } from '@/contexts/Core/Session/application/SessionProvider';

export class SessionMessagesMediaDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'session.messages.media';

  readonly tenantId: string;
  readonly payload: SessionMessagesMediaPayload;

  constructor(params: {
    aggregateId: string;
    tenantId: string;
    payload: SessionMessagesMediaPayload;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, tenantId, payload, eventId, occurredOn } = params;
    super({ eventName: SessionMessagesMediaDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.tenantId = tenantId;
    this.payload = payload;
  }

  toPrimitives(): { tenantId: string } & SessionMessagesMediaPayload {
    return {
      tenantId: this.tenantId,
      ...this.payload,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: { tenantId: string } & SessionMessagesMediaPayload;
  }): SessionMessagesMediaDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new SessionMessagesMediaDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      tenantId: attributes.tenantId,
      payload: {
        mediaCount: attributes.mediaCount ?? 0,
        media: attributes.media ?? [],
        source: attributes.source ?? 'event',
      },
    });
  }
}
