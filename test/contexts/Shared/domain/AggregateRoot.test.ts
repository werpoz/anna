import { describe, it, expect } from 'bun:test';
import { AggregateRoot } from '@/contexts/Shared/domain/AggregateRoot';
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

class TestAggregate extends AggregateRoot {
  toPrimitives(): Record<string, unknown> {
    return { ok: true };
  }
}

describe('AggregateRoot', () => {
  it('records and pulls domain events', () => {
    const aggregate = new TestAggregate();
    const event = new TestEvent();

    aggregate.record(event);
    const pulled = aggregate.pullDomainEvents();

    expect(pulled).toHaveLength(1);
    expect(pulled[0]).toBe(event);
    expect(aggregate.pullDomainEvents()).toHaveLength(0);
  });
});
