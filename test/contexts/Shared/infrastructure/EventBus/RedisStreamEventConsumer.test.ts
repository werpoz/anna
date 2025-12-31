import { describe, it, expect } from 'bun:test';
import { RedisStreamEventConsumer } from '@/contexts/Shared/infrastructure/EventBus/RedisStreamEventConsumer';
import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import { DomainEventSubscribers } from '@/contexts/Shared/infrastructure/EventBus/DomainEventSubscribers';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
import type { DeadLetterRepository } from '@/contexts/Shared/infrastructure/DeadLetter/DeadLetterRepository';
import type { DeadLetterMessage } from '@/contexts/Shared/infrastructure/DeadLetter/DeadLetterMessage';

class TestEvent extends DomainEvent {
  static override EVENT_NAME = 'test.event';

  constructor(props?: { eventId?: string; aggregateId?: string; occurredOn?: Date }) {
    super({
      eventName: TestEvent.EVENT_NAME,
      aggregateId: props?.aggregateId ?? 'agg-1',
      eventId: props?.eventId,
      occurredOn: props?.occurredOn ?? new Date('2024-01-01T00:00:00.000Z'),
    });
  }

  toPrimitives(): Record<string, unknown> {
    return { ok: true };
  }

  static override fromPrimitives(params: {
    aggregateId: string;
    eventId: string;
    occurredOn: Date;
  }): DomainEvent {
    return new TestEvent({
      aggregateId: params.aggregateId,
      eventId: params.eventId,
      occurredOn: params.occurredOn,
    });
  }
}

class RecordingSubscriber implements DomainEventSubscriber<TestEvent> {
  public handled: DomainEvent[] = [];

  subscribedTo(): Array<typeof TestEvent> {
    return [TestEvent];
  }

  async on(event: TestEvent): Promise<void> {
    this.handled.push(event);
  }
}

class ThrowingSubscriber implements DomainEventSubscriber<TestEvent> {
  subscribedTo(): Array<typeof TestEvent> {
    return [TestEvent];
  }

  async on(): Promise<void> {
    throw new Error('boom');
  }
}

class FakeRedis {
  public data = new Map<string, string>();
  public acked: Array<{ stream: string; group: string; id: string }> = [];
  public xaddCalls: unknown[][] = [];
  public xaddShouldFail = false;
  public pexpireCalls: Array<{ key: string; ttl: number }> = [];
  public xgroupCalls: Array<unknown[]> = [];
  public xgroupError: Error | null = null;
  public readCalls: Array<unknown[]> = [];
  public readResponses: Array<StreamResponse | null | Error> = [];
  public autoClaimCalls: Array<unknown[]> = [];
  public autoClaimResponses: Array<[string, StreamEntry[], string[]]> = [];

  async exists(key: string): Promise<number> {
    return this.data.has(key) ? 1 : 0;
  }

  async set(key: string, value: string, mode?: string, ttl?: number): Promise<void> {
    this.data.set(key, value);
    if (mode === 'PX' && typeof ttl === 'number') {
      this.pexpireCalls.push({ key, ttl });
    }
  }

  async del(...keys: string[]): Promise<number> {
    keys.forEach((key) => this.data.delete(key));
    return keys.length;
  }

  async incr(key: string): Promise<number> {
    const next = Number(this.data.get(key) ?? '0') + 1;
    this.data.set(key, String(next));
    return next;
  }

  async pexpire(key: string, ttl: number): Promise<number> {
    this.pexpireCalls.push({ key, ttl });
    return 1;
  }

  async xack(stream: string, group: string, id: string): Promise<void> {
    this.acked.push({ stream, group, id });
  }

  async xadd(...args: unknown[]): Promise<void> {
    if (this.xaddShouldFail) {
      throw new Error('xadd failed');
    }
    this.xaddCalls.push(args);
  }

  async xgroup(...args: unknown[]): Promise<void> {
    this.xgroupCalls.push(args);
    if (this.xgroupError) {
      throw this.xgroupError;
    }
  }

  async xreadgroup(...args: unknown[]): Promise<StreamResponse | null> {
    this.readCalls.push(args);
    const response = this.readResponses.shift();
    if (response instanceof Error) {
      throw response;
    }
    return response ?? null;
  }

  async xautoclaim(...args: unknown[]): Promise<[string, StreamEntry[], string[]]> {
    this.autoClaimCalls.push(args);
    return this.autoClaimResponses.shift() ?? ['0-0', [], []];
  }
}

class FakeDeadLetterRepository implements DeadLetterRepository {
  public added: DeadLetterMessage[] = [];

  async add(message: DeadLetterMessage): Promise<void> {
    this.added.push(message);
  }
}

const baseOptions = {
  stream: 'events',
  group: 'events-group',
  consumer: 'consumer-1',
  batchSize: 10,
  blockMs: 1,
  claimIdleMs: 1,
  claimIntervalMs: 0,
  maxAttempts: 3,
  backoffMs: 1000,
  backoffMaxMs: 5000,
  processedTtlMs: 60_000,
  dlqStream: 'events-dlq',
};

const buildFields = (overrides?: {
  eventName?: string;
  eventId?: string;
  aggregateId?: string;
  occurredOn?: string;
  payload?: Record<string, unknown>;
}): string[] => {
  const payload = overrides?.payload ?? { ok: true };
  return [
    'eventName',
    overrides?.eventName ?? TestEvent.EVENT_NAME,
    'eventId',
    overrides?.eventId ?? 'evt-1',
    'aggregateId',
    overrides?.aggregateId ?? 'agg-1',
    'occurredOn',
    overrides?.occurredOn ?? new Date('2024-01-01T00:00:00.000Z').toISOString(),
    'payload',
    JSON.stringify(payload),
  ];
};

const buildConsumer = (
  redis: FakeRedis,
  subscribers: DomainEventSubscribers,
  overrides?: Partial<typeof baseOptions>,
  deadLetterRepository?: DeadLetterRepository
): RedisStreamEventConsumer => {
  return new RedisStreamEventConsumer(
    redis as any,
    subscribers,
    { ...baseOptions, ...overrides },
    deadLetterRepository
  );
};

describe('RedisStreamEventConsumer', () => {
  it('ensures group and ignores BUSYGROUP errors', async () => {
    const redis = new FakeRedis();
    redis.xgroupError = new Error('BUSYGROUP Consumer Group name already exists');
    const consumer = buildConsumer(redis, DomainEventSubscribers.from([]));

    await expect((consumer as any).ensureGroup()).resolves.toBeUndefined();
  });

  it('throws when ensureGroup fails with unexpected error', async () => {
    const redis = new FakeRedis();
    redis.xgroupError = new Error('boom');
    const consumer = buildConsumer(redis, DomainEventSubscribers.from([]));

    await expect((consumer as any).ensureGroup()).rejects.toThrow('boom');
  });

  it('skips claim when interval has not elapsed', async () => {
    const redis = new FakeRedis();
    const consumer = buildConsumer(redis, DomainEventSubscribers.from([]), { claimIntervalMs: 10_000 });

    (consumer as any).lastClaimAt = Date.now();
    await (consumer as any).claimPendingIfNeeded();

    expect(redis.autoClaimCalls).toHaveLength(0);
  });

  it('claims pending entries and processes them', async () => {
    const redis = new FakeRedis();
    const subscriber = new RecordingSubscriber();
    const consumers = DomainEventSubscribers.from([
      subscriber as DomainEventSubscriber<DomainEvent>,
    ]);
    const consumer = buildConsumer(redis, consumers, { claimIntervalMs: 0 });

    redis.autoClaimResponses.push(['1-0', [['1-0', buildFields()]], []]);

    await (consumer as any).claimPendingIfNeeded();

    expect(redis.autoClaimCalls).toHaveLength(1);
    expect(subscriber.handled).toHaveLength(1);
  });

  it('processes entries from start loop', async () => {
    const redis = new FakeRedis();
    const subscriber = new RecordingSubscriber();
    const consumers = DomainEventSubscribers.from([
      subscriber as DomainEventSubscriber<DomainEvent>,
    ]);
    const consumer = buildConsumer(redis, consumers, { blockMs: 1 });

    redis.readResponses.push([['events', [['1-0', buildFields()]]]]);
    redis.readResponses.push(new Error('stop'));

    await expect(consumer.start()).rejects.toThrow('stop');

    expect(redis.readCalls.length).toBeGreaterThan(0);
    expect(subscriber.handled).toHaveLength(1);
  });

  it('acks when required fields are missing', async () => {
    const redis = new FakeRedis();
    const consumer = buildConsumer(redis, DomainEventSubscribers.from([]));

    await (consumer as any).handleEntry('1-0', ['eventName', TestEvent.EVENT_NAME]);

    expect(redis.acked).toHaveLength(1);
  });

  it('acks when event was already processed', async () => {
    const redis = new FakeRedis();
    redis.data.set('events:processed:evt-1', '1');
    const consumer = buildConsumer(redis, DomainEventSubscribers.from([]));

    await (consumer as any).handleEntry('1-0', buildFields());

    expect(redis.acked).toHaveLength(1);
  });

  it('does not ack when retry is blocked', async () => {
    const redis = new FakeRedis();
    redis.data.set('events:retry:evt-1', '1');
    const consumer = buildConsumer(redis, DomainEventSubscribers.from([]));

    await (consumer as any).handleEntry('1-0', buildFields());

    expect(redis.acked).toHaveLength(0);
  });

  it('processes events and marks them as processed', async () => {
    const redis = new FakeRedis();
    const subscriber = new RecordingSubscriber();
    const consumers = DomainEventSubscribers.from([
      subscriber as DomainEventSubscriber<DomainEvent>,
    ]);
    const consumer = buildConsumer(redis, consumers);

    await (consumer as any).handleEntry('1-0', buildFields());

    expect(subscriber.handled).toHaveLength(1);
    expect(redis.acked).toHaveLength(1);
    expect(redis.data.has('events:processed:evt-1')).toBe(true);
    expect(redis.data.has('events:attempts:evt-1')).toBe(false);
    expect(redis.data.has('events:retry:evt-1')).toBe(false);
  });

  it('sets retry marker on failure', async () => {
    const redis = new FakeRedis();
    const consumers = DomainEventSubscribers.from([
      new ThrowingSubscriber() as DomainEventSubscriber<DomainEvent>,
    ]);
    const consumer = buildConsumer(redis, consumers, { maxAttempts: 3 });

    await (consumer as any).handleEntry('1-0', buildFields());

    expect(redis.acked).toHaveLength(0);
    expect(redis.data.has('events:retry:evt-1')).toBe(true);
  });

  it('sends to DLQ after max attempts and acks', async () => {
    const redis = new FakeRedis();
    redis.data.set('events:attempts:evt-1', '2');
    const consumers = DomainEventSubscribers.from([
      new ThrowingSubscriber() as DomainEventSubscriber<DomainEvent>,
    ]);
    const consumer = buildConsumer(redis, consumers, { maxAttempts: 3 });

    await (consumer as any).handleEntry('1-0', buildFields());

    expect(redis.xaddCalls).toHaveLength(1);
    expect(redis.acked).toHaveLength(1);
    expect(redis.data.has('events:processed:evt-1')).toBe(true);
    expect(redis.data.has('events:attempts:evt-1')).toBe(false);
  });

  it('falls back to dead letter repository when DLQ publish fails', async () => {
    const redis = new FakeRedis();
    redis.xaddShouldFail = true;
    const deadLetter = new FakeDeadLetterRepository();
    const consumers = DomainEventSubscribers.from([
      new ThrowingSubscriber() as DomainEventSubscriber<DomainEvent>,
    ]);
    const consumer = buildConsumer(redis, consumers, { maxAttempts: 1 }, deadLetter);

    await (consumer as any).handleEntry('1-0', buildFields());

    expect(deadLetter.added).toHaveLength(1);
    expect(redis.acked).toHaveLength(1);
  });
});
