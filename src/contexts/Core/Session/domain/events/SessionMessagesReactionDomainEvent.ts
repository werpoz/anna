import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import type { SessionMessagesReactionPayload } from '@/contexts/Core/Session/application/SessionProvider';

export class SessionMessagesReactionDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'session.messages.reaction';

  readonly tenantId: string;
  readonly payload: SessionMessagesReactionPayload;

  constructor(params: {
    aggregateId: string;
    tenantId: string;
    payload: SessionMessagesReactionPayload;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, tenantId, payload, eventId, occurredOn } = params;
    super({ eventName: SessionMessagesReactionDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.tenantId = tenantId;
    this.payload = payload;
  }

  toPrimitives(): { tenantId: string } & SessionMessagesReactionPayload {
    return {
      tenantId: this.tenantId,
      ...this.payload,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: { tenantId: string } & SessionMessagesReactionPayload;
  }): SessionMessagesReactionDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new SessionMessagesReactionDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      tenantId: attributes.tenantId,
      payload: {
        reactionsCount: attributes.reactionsCount ?? 0,
        reactions: attributes.reactions ?? [],
        source: attributes.source ?? 'event',
      },
    });
  }
}
