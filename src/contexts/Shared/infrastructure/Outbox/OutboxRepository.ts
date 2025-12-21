import type { OutboxMessage } from '@/contexts/Shared/infrastructure/Outbox/OutboxMessage';

export interface OutboxRepository {
  add(message: OutboxMessage): Promise<void>;
  pullPending(limit: number): Promise<Array<OutboxMessage>>;
  markPublished(id: string): Promise<void>;
  markPending(id: string, errorMessage: string): Promise<void>;
}
