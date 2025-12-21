import type { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';

export type OutboxStatus = 'pending' | 'processing' | 'published';

export type OutboxMessage = {
  id: string;
  eventId: string;
  aggregateId: string;
  eventName: string;
  occurredOn: Date;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  attempts: number;
  lastError?: string | null;
};

export const outboxMessageFromDomainEvent = (event: DomainEvent): OutboxMessage => {
  return {
    id: crypto.randomUUID(),
    eventId: event.eventId,
    aggregateId: event.aggregateId,
    eventName: event.eventName,
    occurredOn: event.occurredOn,
    payload: event.toPrimitives() as Record<string, unknown>,
    status: 'pending',
    attempts: 0,
  };
};
