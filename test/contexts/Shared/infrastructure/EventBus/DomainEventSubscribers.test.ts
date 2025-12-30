import { describe, it, expect } from 'bun:test';
import { DomainEventSubscribers } from '@/contexts/Shared/infrastructure/EventBus/DomainEventSubscribers';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
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

class TestSubscriber implements DomainEventSubscriber<TestEvent> {
  subscribedTo(): Array<typeof TestEvent> {
    return [TestEvent];
  }

  async on(): Promise<void> {
    return;
  }
}

describe('DomainEventSubscribers', () => {
  it('maps subscribers by event name', () => {
    const subscriber = new TestSubscriber();
    const subscribers = DomainEventSubscribers.from([subscriber as DomainEventSubscriber<DomainEvent>]);

    expect(subscribers.all()).toHaveLength(1);
    expect(subscribers.getSubscribersFor(TestEvent.EVENT_NAME)).toHaveLength(1);
  });

  it('adds subscribers from another collection', () => {
    const first = new TestSubscriber();
    const second = new TestSubscriber();
    const base = DomainEventSubscribers.from([first as DomainEventSubscriber<DomainEvent>]);
    const extra = DomainEventSubscribers.from([second as DomainEventSubscriber<DomainEvent>]);

    base.add(extra);
    expect(base.getSubscribersFor(TestEvent.EVENT_NAME)).toHaveLength(2);
  });
});
