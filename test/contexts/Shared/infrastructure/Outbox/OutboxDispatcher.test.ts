import { describe, it, expect } from 'bun:test';
import { OutboxDispatcher } from '@/contexts/Shared/infrastructure/Outbox/OutboxDispatcher';
import type { OutboxRepository } from '@/contexts/Shared/infrastructure/Outbox/OutboxRepository';
import type { OutboxMessage } from '@/contexts/Shared/infrastructure/Outbox/OutboxMessage';
import type { RedisStreamPublisher } from '@/contexts/Shared/infrastructure/EventBus/RedisStreamPublisher';

const buildMessage = (id: string): OutboxMessage => ({
  id,
  eventId: `evt-${id}`,
  aggregateId: `agg-${id}`,
  eventName: 'test.event',
  occurredOn: new Date('2024-01-01T00:00:00.000Z'),
  payload: { id },
  status: 'pending',
  attempts: 0,
});

class FakeRepository implements OutboxRepository {
  public published: string[] = [];
  public pending: Array<{ id: string; error: string }> = [];
  constructor(private readonly messages: OutboxMessage[]) {}

  async add(): Promise<void> {}

  async pullPending(limit: number): Promise<OutboxMessage[]> {
    return this.messages.slice(0, limit);
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
      throw new Error('publish failed');
    }
  }
}

describe('OutboxDispatcher', () => {
  it('marks messages as published on success', async () => {
    const repo = new FakeRepository([buildMessage('1')]);
    const publisher = new FakePublisher();
    const dispatcher = new OutboxDispatcher(repo, publisher as any, { batchSize: 10, intervalMs: 1 });

    const processed = await dispatcher.runOnce();

    expect(processed).toBe(1);
    expect(repo.published).toEqual(['1']);
  });

  it('marks messages as pending on failure', async () => {
    const repo = new FakeRepository([buildMessage('2')]);
    const publisher = new FakePublisher();
    publisher.shouldFail = true;
    const dispatcher = new OutboxDispatcher(repo, publisher as any, { batchSize: 10, intervalMs: 1 });

    const processed = await dispatcher.runOnce();

    expect(processed).toBe(1);
    expect(repo.pending).toHaveLength(1);
  });
});
