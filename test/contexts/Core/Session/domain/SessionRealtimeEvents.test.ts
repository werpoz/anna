import { describe, expect, it } from 'bun:test';
import { SessionContactsUpsertDomainEvent } from '@/contexts/Core/Session/domain/events/SessionContactsUpsertDomainEvent';
import { SessionMessagesUpdateDomainEvent } from '@/contexts/Core/Session/domain/events/SessionMessagesUpdateDomainEvent';
import { SessionPresenceUpdateDomainEvent } from '@/contexts/Core/Session/domain/events/SessionPresenceUpdateDomainEvent';

describe('Session realtime domain events', () => {
  it('round-trips session contacts upsert', () => {
    const event = new SessionContactsUpsertDomainEvent({
      aggregateId: 'session-1',
      tenantId: 'tenant-1',
      payload: {
        contactsCount: 2,
        contactsTruncated: false,
        source: 'event',
        contacts: [
          { id: 'jid-1', name: 'Ada' },
          { id: 'jid-2', notify: 'Grace' },
        ],
      },
    });

    const rebuilt = SessionContactsUpsertDomainEvent.fromPrimitives({
      aggregateId: event.aggregateId,
      eventId: event.eventId,
      occurredOn: event.occurredOn,
      attributes: event.toPrimitives(),
    });

    expect(rebuilt.tenantId).toBe(event.tenantId);
    expect(rebuilt.payload.contactsCount).toBe(2);
    expect(rebuilt.payload.contacts[0]?.id).toBe('jid-1');
  });

  it('round-trips session messages update', () => {
    const event = new SessionMessagesUpdateDomainEvent({
      aggregateId: 'session-1',
      tenantId: 'tenant-1',
      payload: {
        updatesCount: 1,
        source: 'receipt',
        updates: [
          {
            messageId: 'msg-1',
            status: 'read',
            statusAt: 1710000000,
          },
        ],
      },
    });

    const rebuilt = SessionMessagesUpdateDomainEvent.fromPrimitives({
      aggregateId: event.aggregateId,
      eventId: event.eventId,
      occurredOn: event.occurredOn,
      attributes: event.toPrimitives(),
    });

    expect(rebuilt.tenantId).toBe(event.tenantId);
    expect(rebuilt.payload.updates[0]?.status).toBe('read');
    expect(rebuilt.payload.updates[0]?.messageId).toBe('msg-1');
  });

  it('round-trips session presence update', () => {
    const event = new SessionPresenceUpdateDomainEvent({
      aggregateId: 'session-1',
      tenantId: 'tenant-1',
      payload: {
        chatJid: '123@g.us',
        updatesCount: 1,
        updates: [{ jid: 'user-1@s.whatsapp.net', presence: 'composing', lastSeen: null }],
      },
    });

    const rebuilt = SessionPresenceUpdateDomainEvent.fromPrimitives({
      aggregateId: event.aggregateId,
      eventId: event.eventId,
      occurredOn: event.occurredOn,
      attributes: event.toPrimitives(),
    });

    expect(rebuilt.payload.chatJid).toBe('123@g.us');
    expect(rebuilt.payload.updates[0]?.presence).toBe('composing');
  });
});
