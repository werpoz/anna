import { describe, it, expect } from 'bun:test';
import { RedisStreamPublisher } from '@/contexts/Shared/infrastructure/EventBus/RedisStreamPublisher';
import type { OutboxMessage } from '@/contexts/Shared/infrastructure/Outbox/OutboxMessage';

class FakeRedis {
  public calls: Array<unknown[]> = [];
  async xadd(...args: unknown[]): Promise<void> {
    this.calls.push(args);
  }
}

describe('RedisStreamPublisher', () => {
  it('publishes message to stream', async () => {
    const redis = new FakeRedis();
    const publisher = new RedisStreamPublisher(redis as any, 'events');

    const message: OutboxMessage = {
      id: '1',
      eventId: 'evt',
      aggregateId: 'agg',
      eventName: 'test.event',
      occurredOn: new Date('2024-01-01T00:00:00.000Z'),
      payload: { ok: true },
      status: 'pending',
      attempts: 0,
    };

    await publisher.publish(message);

    expect(redis.calls).toHaveLength(1);
    const args = redis.calls[0] as string[];
    expect(args[0]).toBe('events');
    expect(args).toContain('eventName');
    expect(args).toContain('test.event');
  });
});
