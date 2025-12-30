import { describe, it, expect } from 'bun:test';
import { RedisStreamEventBus } from '@/contexts/Shared/infrastructure/EventBus/RedisStreamEventBus';
import type { OutboxRepository } from '@/contexts/Shared/infrastructure/Outbox/OutboxRepository';
import type { RedisStreamPublisher } from '@/contexts/Shared/infrastructure/EventBus/RedisStreamPublisher';
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

class FakeOutboxRepository implements OutboxRepository {
  public added = 0;
  public published: string[] = [];
  public pending: Array<{ id: string; error: string }> = [];

  async add(_message: any): Promise<void> {
    this.added += 1;
  }

  async pullPending(_limit: number): Promise<any[]> {
    return [];
  }

  async markPublished(id: string): Promise<void> {
    this.published.push(id);
  }

  async markPending(id: string, errorMessage: string): Promise<void> {
    this.pending.push({ id, error: errorMessage });
  }
}

class FakePublisher {
  public shouldFail = false;

  async publish(): Promise<void> {
    if (this.shouldFail) {
      throw new Error('boom');
    }
  }
}

describe('RedisStreamEventBus', () => {
  it('marks published on success', async () => {
    const repo = new FakeOutboxRepository();
    const publisher = new FakePublisher();
    const bus = new RedisStreamEventBus(repo, publisher as any);

    await bus.publish([new TestEvent()]);
    expect(repo.added).toBe(1);
    expect(repo.published).toHaveLength(1);
  });

  it('marks pending on failure', async () => {
    const repo = new FakeOutboxRepository();
    const publisher = new FakePublisher();
    publisher.shouldFail = true;
    const bus = new RedisStreamEventBus(repo, publisher as any);

    await bus.publish([new TestEvent()]);
    expect(repo.pending).toHaveLength(1);
  });
});
