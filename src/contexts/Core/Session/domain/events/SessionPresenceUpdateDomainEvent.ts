import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import type { SessionPresenceUpdatePayload } from '@/contexts/Core/Session/application/SessionProvider';

export class SessionPresenceUpdateDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'session.presence.update';

  readonly tenantId: string;
  readonly payload: SessionPresenceUpdatePayload;

  constructor(params: {
    aggregateId: string;
    tenantId: string;
    payload: SessionPresenceUpdatePayload;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, tenantId, payload, eventId, occurredOn } = params;
    super({ eventName: SessionPresenceUpdateDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.tenantId = tenantId;
    this.payload = payload;
  }

  toPrimitives(): { tenantId: string } & SessionPresenceUpdatePayload {
    return {
      tenantId: this.tenantId,
      ...this.payload,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: { tenantId: string } & SessionPresenceUpdatePayload;
  }): SessionPresenceUpdateDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new SessionPresenceUpdateDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      tenantId: attributes.tenantId,
      payload: {
        chatJid: attributes.chatJid,
        updatesCount: attributes.updatesCount ?? 0,
        updates: attributes.updates ?? [],
      },
    });
  }
}
