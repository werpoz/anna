import { DomainEventSubscribers } from '@/contexts/Shared/infrastructure/EventBus/DomainEventSubscribers';
import { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';

export interface EventBus {
  publish(events: Array<DomainEvent>): Promise<void>;
  addSubscribers(subscribers: DomainEventSubscribers): void;
}
