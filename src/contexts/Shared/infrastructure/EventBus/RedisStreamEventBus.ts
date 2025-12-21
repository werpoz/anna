import type { EventBus } from '@/contexts/Shared/domain/EventBus';
import type { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import type { DomainEventSubscribers } from '@/contexts/Shared/infrastructure/EventBus/DomainEventSubscribers';
import type { OutboxRepository } from '@/contexts/Shared/infrastructure/Outbox/OutboxRepository';
import { outboxMessageFromDomainEvent } from '@/contexts/Shared/infrastructure/Outbox/OutboxMessage';
import type { RedisStreamPublisher } from '@/contexts/Shared/infrastructure/EventBus/RedisStreamPublisher';

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
