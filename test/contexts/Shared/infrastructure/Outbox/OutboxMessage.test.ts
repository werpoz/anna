import { describe, it, expect } from 'bun:test';
import { outboxMessageFromDomainEvent } from '@/contexts/Shared/infrastructure/Outbox/OutboxMessage';
import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';

class TestEvent extends DomainEvent {
  static override EVENT_NAME = 'test.event';

  constructor() {
    super({ eventName: TestEvent.EVENT_NAME, aggregateId: 'agg-1' });
  }

  toPrimitives(): Record<string, unknown> {
    return { ok: true };
  }

  static override fromPrimitives(): DomainEvent {
    return new TestEvent();
  }
}

describe('OutboxMessage', () => {
  it('builds message from domain event', () => {
    const event = new TestEvent();
    const message = outboxMessageFromDomainEvent(event);

    expect(message.eventId).toBe(event.eventId);
    expect(message.aggregateId).toBe(event.aggregateId);
    expect(message.eventName).toBe(event.eventName);
    expect(message.status).toBe('pending');
    expect(message.attempts).toBe(0);
    expect(message.payload).toEqual({ ok: true });
  });
});
