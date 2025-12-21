import type Redis from 'ioredis';
import type { OutboxMessage } from '../Outbox/OutboxMessage';

export class RedisStreamPublisher {
  private readonly redis: Redis;
  private readonly stream: string;

  constructor(redis: Redis, stream: string) {
    this.redis = redis;
    this.stream = stream;
  }

  async publish(message: OutboxMessage): Promise<void> {
    await this.redis.xadd(
      this.stream,
      '*',
      'outboxId',
      message.id,
      'eventName',
      message.eventName,
      'eventId',
      message.eventId,
      'aggregateId',
      message.aggregateId,
      'occurredOn',
      message.occurredOn.toISOString(),
      'payload',
      JSON.stringify(message.payload)
    );
  }
}
