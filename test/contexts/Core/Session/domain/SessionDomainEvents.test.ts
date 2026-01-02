import { describe, it, expect } from 'bun:test';
import { SessionCreatedDomainEvent } from '@/contexts/Core/Session/domain/events/SessionCreatedDomainEvent';
import { SessionQrUpdatedDomainEvent } from '@/contexts/Core/Session/domain/events/SessionQrUpdatedDomainEvent';
import { SessionConnectedDomainEvent } from '@/contexts/Core/Session/domain/events/SessionConnectedDomainEvent';
import { SessionDisconnectedDomainEvent } from '@/contexts/Core/Session/domain/events/SessionDisconnectedDomainEvent';

describe('Session domain events', () => {
  it('round-trips session created', () => {
    const event = new SessionCreatedDomainEvent({
      aggregateId: 'session-1',
      tenantId: 'tenant-1',
      status: 'pending_qr',
      createdAt: '2024-01-01T00:00:00.000Z',
    });

    const rebuilt = SessionCreatedDomainEvent.fromPrimitives({
      aggregateId: event.aggregateId,
      eventId: event.eventId,
      occurredOn: event.occurredOn,
      attributes: event.toPrimitives(),
    });

    expect(rebuilt.aggregateId).toBe(event.aggregateId);
    expect(rebuilt.tenantId).toBe(event.tenantId);
  });

  it('round-trips session qr updated', () => {
    const event = new SessionQrUpdatedDomainEvent({
      aggregateId: 'session-1',
      tenantId: 'tenant-1',
      qr: 'qr-value',
      expiresAt: '2024-01-01T00:10:00.000Z',
    });

    const rebuilt = SessionQrUpdatedDomainEvent.fromPrimitives({
      aggregateId: event.aggregateId,
      eventId: event.eventId,
      occurredOn: event.occurredOn,
      attributes: event.toPrimitives(),
    });

    expect(rebuilt.qr).toBe(event.qr);
    expect(rebuilt.expiresAt).toBe(event.expiresAt);
  });

  it('round-trips session connected', () => {
    const event = new SessionConnectedDomainEvent({
      aggregateId: 'session-1',
      tenantId: 'tenant-1',
      phone: '+123',
      connectedAt: '2024-01-01T00:10:00.000Z',
    });

    const rebuilt = SessionConnectedDomainEvent.fromPrimitives({
      aggregateId: event.aggregateId,
      eventId: event.eventId,
      occurredOn: event.occurredOn,
      attributes: event.toPrimitives(),
    });

    expect(rebuilt.phone).toBe(event.phone);
    expect(rebuilt.connectedAt).toBe(event.connectedAt);
  });

  it('round-trips session disconnected', () => {
    const event = new SessionDisconnectedDomainEvent({
      aggregateId: 'session-1',
      tenantId: 'tenant-1',
      reason: 'logout',
      disconnectedAt: '2024-01-01T00:10:00.000Z',
    });

    const rebuilt = SessionDisconnectedDomainEvent.fromPrimitives({
      aggregateId: event.aggregateId,
      eventId: event.eventId,
      occurredOn: event.occurredOn,
      attributes: event.toPrimitives(),
    });

    expect(rebuilt.reason).toBe(event.reason);
    expect(rebuilt.disconnectedAt).toBe(event.disconnectedAt);
  });
});
