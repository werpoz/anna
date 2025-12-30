import { describe, it, expect } from 'bun:test';
import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import { Uuid } from '@/contexts/Shared/domain/value-object/Uuid';

class TestEvent extends DomainEvent {
  static override EVENT_NAME = 'test.event';

  constructor(eventId?: string) {
    super({ eventName: TestEvent.EVENT_NAME, aggregateId: 'agg-1', eventId });
  }

  toPrimitives(): Record<string, unknown> {
    return { ok: true };
  }

  static override fromPrimitives(): DomainEvent {
    return new TestEvent();
  }
}

describe('DomainEvent', () => {
  it('creates with event name and aggregate id', () => {
    const event = new TestEvent();
    expect(event.eventName).toBe(TestEvent.EVENT_NAME);
    expect(event.aggregateId).toBe('agg-1');
  });

  it('generates eventId when missing', () => {
    const event = new TestEvent();
    expect(Uuid.isValid(event.eventId)).toBe(true);
  });

  it('uses provided eventId', () => {
    const event = new TestEvent('event-123');
    expect(event.eventId).toBe('event-123');
  });
});
