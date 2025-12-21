import type { EventBus } from '../../domain/EventBus';
import type { DomainEvent } from '../../domain/DomainEvent';
import type { DomainEventSubscribers } from './DomainEventSubscribers';
import type { OutboxRepository } from '../Outbox/OutboxRepository';
import { outboxMessageFromDomainEvent } from '../Outbox/OutboxMessage';
import type { RedisStreamPublisher } from './RedisStreamPublisher';

export class RedisStreamEventBus implements EventBus {
  private readonly outboxRepository: OutboxRepository;
  private readonly publisher: RedisStreamPublisher;

  constructor(outboxRepository: OutboxRepository, publisher: RedisStreamPublisher) {
    this.outboxRepository = outboxRepository;
    this.publisher = publisher;
  }

  addSubscribers(_subscribers: DomainEventSubscribers): void {
    // Subscribers are handled by a separate Redis stream consumer.
  }

  async publish(events: Array<DomainEvent>): Promise<void> {
    for (const event of events) {
      const message = outboxMessageFromDomainEvent(event);
      await this.outboxRepository.add(message);

      try {
        await this.publisher.publish(message);
        await this.outboxRepository.markPublished(message.id);
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        await this.outboxRepository.markPending(message.id, messageText);
      }
    }
  }
}
