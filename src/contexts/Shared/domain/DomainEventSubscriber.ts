import { DomainEvent, type DomainEventClass } from '@/contexts/Shared/domain/DomainEvent';

export interface DomainEventSubscriber<T extends DomainEvent> {
  subscribedTo(): Array<DomainEventClass>;
  on(domainEvent: T): Promise<void>;
}
