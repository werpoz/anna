import type { EventBus } from '../../domain/EventBus';
import { DomainEvent } from '../../domain/DomainEvent';
import { DomainEventSubscribers } from './DomainEventSubscribers';

export class InMemoryEventBus implements EventBus {
  private subscribers: DomainEventSubscribers;

  constructor(subscribers?: DomainEventSubscribers) {
    this.subscribers = subscribers ?? DomainEventSubscribers.from([]);
  }

  addSubscribers(subscribers: DomainEventSubscribers): void {
    this.subscribers.add(subscribers);
  }

  async publish(events: Array<DomainEvent>): Promise<void> {
    for (const event of events) {
      const eventSubscribers = this.subscribers.getSubscribersFor(event.eventName);
      for (const subscriber of eventSubscribers) {
        await subscriber.on(event);
      }
    }
  }
}
