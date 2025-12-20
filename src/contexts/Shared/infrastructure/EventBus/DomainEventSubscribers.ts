import { DomainEvent } from '../../domain/DomainEvent';
import type { DomainEventSubscriber } from '../../domain/DomainEventSubscriber';

export class DomainEventSubscribers {
  private readonly mapping: Map<string, Array<DomainEventSubscriber<DomainEvent>>>;
  private readonly subscribers: Array<DomainEventSubscriber<DomainEvent>>;

  constructor(subscribers: Array<DomainEventSubscriber<DomainEvent>>) {
    this.mapping = new Map();
    this.subscribers = [];
    this.addSubscribers(subscribers);
  }

  static from(subscribers: Array<DomainEventSubscriber<DomainEvent>>): DomainEventSubscribers {
    return new DomainEventSubscribers(subscribers);
  }

  all(): Array<DomainEventSubscriber<DomainEvent>> {
    return this.subscribers.slice();
  }

  getSubscribersFor(eventName: string): Array<DomainEventSubscriber<DomainEvent>> {
    return this.mapping.get(eventName) ?? [];
  }

  add(subscribers: DomainEventSubscribers): void {
    this.addSubscribers(subscribers.all());
  }

  private addSubscribers(subscribers: Array<DomainEventSubscriber<DomainEvent>>): void {
    subscribers.forEach((subscriber) => this.addSubscriber(subscriber));
  }

  private addSubscriber(subscriber: DomainEventSubscriber<DomainEvent>): void {
    this.subscribers.push(subscriber);
    subscriber.subscribedTo().forEach((eventClass) => {
      const eventName = eventClass.EVENT_NAME;
      const existing = this.mapping.get(eventName) ?? [];
      this.mapping.set(eventName, [...existing, subscriber]);
    });
  }
}
