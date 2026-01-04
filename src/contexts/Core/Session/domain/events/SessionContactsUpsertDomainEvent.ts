import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import type { SessionContactsUpsertPayload } from '@/contexts/Core/Session/application/SessionProvider';

export class SessionContactsUpsertDomainEvent extends DomainEvent {
  static override EVENT_NAME = 'session.contacts.upsert';

  readonly tenantId: string;
  readonly payload: SessionContactsUpsertPayload;

  constructor(params: {
    aggregateId: string;
    tenantId: string;
    payload: SessionContactsUpsertPayload;
    eventId?: string;
    occurredOn?: Date;
  }) {
    const { aggregateId, tenantId, payload, eventId, occurredOn } = params;
    super({ eventName: SessionContactsUpsertDomainEvent.EVENT_NAME, aggregateId, eventId, occurredOn });
    this.tenantId = tenantId;
    this.payload = payload;
  }

  toPrimitives(): { tenantId: string } & SessionContactsUpsertPayload {
    return {
      tenantId: this.tenantId,
      ...this.payload,
    };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
    attributes: { tenantId: string } & SessionContactsUpsertPayload;
  }): SessionContactsUpsertDomainEvent {
    const { aggregateId, eventId, occurredOn, attributes } = params;
    return new SessionContactsUpsertDomainEvent({
      aggregateId,
      eventId,
      occurredOn,
      tenantId: attributes.tenantId,
      payload: {
        contactsCount: attributes.contactsCount ?? 0,
        contactsTruncated: attributes.contactsTruncated ?? false,
        contacts: attributes.contacts ?? [],
        source: attributes.source,
      },
    });
  }
}
