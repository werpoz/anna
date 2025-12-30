import { describe, it, expect } from 'bun:test';
import { InMemoryEventBus } from '@/contexts/Shared/infrastructure/EventBus/InMemoryEventBus';
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
  public handled: DomainEvent[] = [];

  subscribedTo(): Array<typeof TestEvent> {
    return [TestEvent];
  }

  async on(event: TestEvent): Promise<void> {
    this.handled.push(event);
  }
}

describe('InMemoryEventBus', () => {
  it('publishes to subscribers', async () => {
    const subscriber = new TestSubscriber();
    const bus = new InMemoryEventBus();
    bus.addSubscribers({
      all: () => [subscriber],
      getSubscribersFor: () => [subscriber],
      add: () => undefined,
    } as any);

    await bus.publish([new TestEvent()]);
    expect(subscriber.handled).toHaveLength(1);
  });
});
