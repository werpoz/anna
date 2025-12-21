import type { OutboxRepository } from '@/contexts/Shared/infrastructure/Outbox/OutboxRepository';
import type { RedisStreamPublisher } from '@/contexts/Shared/infrastructure/EventBus/RedisStreamPublisher';
import { metrics } from '@/contexts/Shared/infrastructure/observability/metrics';
import { logger } from '@/contexts/Shared/infrastructure/observability/logger';
import { SpanStatusCode, trace } from '@opentelemetry/api';

type DispatcherOptions = {
  batchSize: number;
  intervalMs: number;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class OutboxDispatcher {
  private readonly repository: OutboxRepository;
  private readonly publisher: RedisStreamPublisher;
  private readonly options: DispatcherOptions;

  constructor(repository: OutboxRepository, publisher: RedisStreamPublisher, options: DispatcherOptions) {
    this.repository = repository;
    this.publisher = publisher;
    this.options = options;
  }

  async runOnce(): Promise<number> {
    const messages = await this.repository.pullPending(this.options.batchSize);
    for (const message of messages) {
      const startTime = Date.now();
      const span = trace.getTracer('outbox-dispatcher').startSpan('outbox.publish', {
        attributes: {
          'event.name': message.eventName,
          'event.id': message.eventId,
        },
      });
      try {
        await this.publisher.publish(message);
        await this.repository.markPublished(message.id);
        metrics.outboxDispatchTotal.inc({ event_name: message.eventName });
        metrics.outboxDispatchDuration.observe({ event_name: message.eventName }, Date.now() - startTime);
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        const exception = error instanceof Error ? error : new Error(String(error));
        const messageText = exception.message;
        await this.repository.markPending(message.id, messageText);
        metrics.outboxDispatchFailed.inc({ event_name: message.eventName });
        metrics.outboxDispatchDuration.observe({ event_name: message.eventName }, Date.now() - startTime);
        span.recordException(exception);
        span.setStatus({ code: SpanStatusCode.ERROR, message: messageText });
        logger.error(`Outbox publish failed: ${messageText}`);
      } finally {
        span.end();
      }
    }

    return messages.length;
  }

  async start(): Promise<void> {
    while (true) {
      const processed = await this.runOnce();
      if (processed === 0) {
        await sleep(this.options.intervalMs);
      }
    }
  }
}
