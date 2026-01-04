import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
import { SessionMessagesUpdateDomainEvent } from '@/contexts/Core/Session/domain/events/SessionMessagesUpdateDomainEvent';
import type { SessionMessageStatusRecord } from '@/contexts/Core/Session/domain/SessionMessageRepository';
import { PostgresSessionMessageRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionMessageRepository';

const resolveTimestamp = (value?: number | null): Date | null => {
  if (!value) {
    return null;
  }
  const millis = value > 1_000_000_000_000 ? value : value * 1000;
  return new Date(millis);
};

export class PersistSessionMessageStatusOnSessionMessagesUpdate
  implements DomainEventSubscriber<SessionMessagesUpdateDomainEvent>
{
  private readonly repository: PostgresSessionMessageRepository;

  constructor() {
    const pool = new Pool({ connectionString: env.databaseUrl });
    this.repository = new PostgresSessionMessageRepository(pool);
  }

  subscribedTo(): Array<typeof SessionMessagesUpdateDomainEvent> {
    return [SessionMessagesUpdateDomainEvent];
  }

  async on(domainEvent: SessionMessagesUpdateDomainEvent): Promise<void> {
    const now = new Date();
    const records: SessionMessageStatusRecord[] = domainEvent.payload.updates
      .filter((update) => Boolean(update.messageId) && (update.status || update.statusAt))
      .map((update) => ({
        sessionId: domainEvent.aggregateId,
        messageId: update.messageId,
        status: update.status ?? null,
        statusAt: resolveTimestamp(update.statusAt ?? undefined),
        updatedAt: now,
      }));

    await this.repository.updateStatuses(records);
  }
}
