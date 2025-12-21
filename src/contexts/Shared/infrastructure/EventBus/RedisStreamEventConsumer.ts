import type Redis from 'ioredis';
import type { DomainEvent, DomainEventClass } from '@/contexts/Shared/domain/DomainEvent';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
import { DomainEventSubscribers } from '@/contexts/Shared/infrastructure/EventBus/DomainEventSubscribers';
import type { DeadLetterRepository } from '@/contexts/Shared/infrastructure/DeadLetter/DeadLetterRepository';
import { metrics } from '@/contexts/Shared/infrastructure/observability/metrics';
import { logger } from '@/contexts/Shared/infrastructure/observability/logger';
import { SpanStatusCode, trace } from '@opentelemetry/api';

type ConsumerOptions = {
  stream: string;
  group: string;
  consumer: string;
  batchSize: number;
  blockMs: number;
  claimIdleMs: number;
  claimIntervalMs: number;
  maxAttempts: number;
  backoffMs: number;
  backoffMaxMs: number;
  processedTtlMs: number;
  dlqStream: string;
};

type StreamEntry = [string, string[]];
type StreamResponse = [string, StreamEntry[]][];

const parseFields = (fields: string[]): Record<string, string> => {
  const record: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    const key = fields[i];
    const value = fields[i + 1];
    if (key !== undefined && value !== undefined) {
      record[key] = value;
    }
  }
  return record;
};

const buildEventClassMap = (
  subscribers: DomainEventSubscribers
): Map<string, DomainEventClass> => {
  const map = new Map<string, DomainEventClass>();
  subscribers.all().forEach((subscriber) => {
    subscriber.subscribedTo().forEach((eventClass) => {
      map.set(eventClass.EVENT_NAME, eventClass);
    });
  });
  return map;
};

export class RedisStreamEventConsumer {
  private readonly redis: Redis;
  private readonly options: ConsumerOptions;
  private readonly subscribers: DomainEventSubscribers;
  private readonly eventClassMap: Map<string, DomainEventClass>;
  private readonly deadLetterRepository?: DeadLetterRepository;
  private claimStartId: string;
  private lastClaimAt: number;

  constructor(
    redis: Redis,
    subscribers: DomainEventSubscribers,
    options: ConsumerOptions,
    deadLetterRepository?: DeadLetterRepository
  ) {
    this.redis = redis;
    this.subscribers = subscribers;
    this.options = options;
    this.eventClassMap = buildEventClassMap(subscribers);
    this.deadLetterRepository = deadLetterRepository;
    this.claimStartId = '0-0';
    this.lastClaimAt = 0;
  }

  async start(): Promise<void> {
    await this.ensureGroup();

    while (true) {
      await this.claimPendingIfNeeded();
      const response = (await this.redis.xreadgroup(
        'GROUP',
        this.options.group,
        this.options.consumer,
        'COUNT',
        this.options.batchSize,
        'BLOCK',
        this.options.blockMs,
        'STREAMS',
        this.options.stream,
        '>'
      )) as StreamResponse | null;

      if (!response) {
        continue;
      }

      for (const [, entries] of response) {
        for (const [entryId, fields] of entries) {
          await this.handleEntry(entryId, fields);
        }
      }
    }
  }

  private async handleEntry(entryId: string, fields: string[]): Promise<void> {
    const data = parseFields(fields);
    const eventName = data.eventName;
    const eventId = data.eventId;
    const aggregateId = data.aggregateId;
    const occurredOn = data.occurredOn;

    if (!eventName || !eventId || !aggregateId || !occurredOn) {
      await this.redis.xack(this.options.stream, this.options.group, entryId);
      return;
    }

    if (await this.isProcessed(eventId)) {
      await this.redis.xack(this.options.stream, this.options.group, entryId);
      return;
    }

    if (await this.isRetryBlocked(eventId)) {
      return;
    }

    const eventClass = this.eventClassMap.get(eventName);
    if (!eventClass) {
      await this.redis.xack(this.options.stream, this.options.group, entryId);
      return;
    }

    const payload = data.payload ? JSON.parse(data.payload) : {};

    const event = eventClass.fromPrimitives({
      aggregateId,
      eventId,
      occurredOn: new Date(occurredOn),
      attributes: payload,
    }) as DomainEvent;

    const startTime = Date.now();
    const span = trace.getTracer('event-consumer').startSpan('event.process', {
      attributes: {
        'event.name': eventName,
        'event.id': eventId,
      },
    });

    try {
      const subscribers = this.subscribers.getSubscribersFor(eventName) as Array<
        DomainEventSubscriber<DomainEvent>
      >;

      for (const subscriber of subscribers) {
        await subscriber.on(event);
      }

      metrics.eventsProcessed.inc({ event_name: eventName });
      metrics.eventProcessingDuration.observe({ event_name: eventName }, Date.now() - startTime);
      await this.markProcessed(eventId);
      await this.clearAttempts(eventId);
      await this.redis.xack(this.options.stream, this.options.group, entryId);
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      metrics.eventsFailed.inc({ event_name: eventName });
      metrics.eventProcessingDuration.observe({ event_name: eventName }, Date.now() - startTime);
      const exception = error instanceof Error ? error : new Error(String(error));
      span.recordException(exception);
      span.setStatus({ code: SpanStatusCode.ERROR, message: exception.message });
      logger.error(`Event processing failed: ${eventName} ${eventId}`);
      await this.handleFailure(entryId, event, error);
    } finally {
      span.end();
    }
  }

  private async ensureGroup(): Promise<void> {
    try {
      await this.redis.xgroup('CREATE', this.options.stream, this.options.group, '$', 'MKSTREAM');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('BUSYGROUP')) {
        throw error;
      }
    }
  }

  private async claimPendingIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastClaimAt < this.options.claimIntervalMs) {
      return;
    }

    this.lastClaimAt = now;

    const response = (await this.redis.xautoclaim(
      this.options.stream,
      this.options.group,
      this.options.consumer,
      this.options.claimIdleMs,
      this.claimStartId,
      'COUNT',
      this.options.batchSize
    )) as [string, StreamEntry[], string[]];

    const [nextId, entries] = response;
    this.claimStartId = nextId ?? '0-0';

    if (!entries?.length) {
      return;
    }

    for (const [entryId, fields] of entries) {
      await this.handleEntry(entryId, fields);
    }
  }

  private processedKey(eventId: string): string {
    return `events:processed:${eventId}`;
  }

  private attemptsKey(eventId: string): string {
    return `events:attempts:${eventId}`;
  }

  private retryKey(eventId: string): string {
    return `events:retry:${eventId}`;
  }

  private async isProcessed(eventId: string): Promise<boolean> {
    const result = await this.redis.exists(this.processedKey(eventId));
    return result === 1;
  }

  private async markProcessed(eventId: string): Promise<void> {
    await this.redis.set(this.processedKey(eventId), '1', 'PX', this.options.processedTtlMs);
  }

  private async clearAttempts(eventId: string): Promise<void> {
    await this.redis.del(this.attemptsKey(eventId), this.retryKey(eventId));
  }

  private async isRetryBlocked(eventId: string): Promise<boolean> {
    const result = await this.redis.exists(this.retryKey(eventId));
    return result === 1;
  }

  private async incrementAttempts(eventId: string): Promise<number> {
    const attempts = await this.redis.incr(this.attemptsKey(eventId));
    if (attempts === 1) {
      await this.redis.pexpire(this.attemptsKey(eventId), this.options.processedTtlMs);
    }
    return attempts;
  }

  private computeBackoffMs(attempts: number): number {
    const exponential = this.options.backoffMs * Math.pow(2, Math.max(0, attempts - 1));
    return Math.min(exponential, this.options.backoffMaxMs);
  }

  private async handleFailure(entryId: string, event: DomainEvent, error: unknown): Promise<void> {
    const attempts = await this.incrementAttempts(event.eventId);
    const messageText = error instanceof Error ? error.message : String(error);

    if (attempts >= this.options.maxAttempts) {
      await this.publishToDlq(event, messageText, attempts);
      await this.markProcessed(event.eventId);
      await this.clearAttempts(event.eventId);
      await this.redis.xack(this.options.stream, this.options.group, entryId);
      return;
    }

    const backoffMs = this.computeBackoffMs(attempts);
    await this.redis.set(this.retryKey(event.eventId), '1', 'PX', backoffMs);
  }

  private async publishToDlq(event: DomainEvent, errorMessage: string, attempts: number): Promise<void> {
    try {
      await this.redis.xadd(
        this.options.dlqStream,
        '*',
        'eventName',
        event.eventName,
        'eventId',
        event.eventId,
        'aggregateId',
        event.aggregateId,
        'occurredOn',
        event.occurredOn.toISOString(),
        'payload',
        JSON.stringify(event.toPrimitives()),
        'error',
        errorMessage,
        'attempts',
        attempts.toString()
      );
      return;
    } catch (error) {
      if (!this.deadLetterRepository) {
        throw error;
      }
    }

    await this.deadLetterRepository.add({
      id: crypto.randomUUID(),
      eventId: event.eventId,
      aggregateId: event.aggregateId,
      eventName: event.eventName,
      occurredOn: event.occurredOn,
      payload: event.toPrimitives() as Record<string, unknown>,
      error: errorMessage,
      attempts,
    });
  }
}
