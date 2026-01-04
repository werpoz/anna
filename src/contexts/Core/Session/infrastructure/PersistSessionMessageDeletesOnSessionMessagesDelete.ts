import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
import { SessionMessagesDeleteDomainEvent } from '@/contexts/Core/Session/domain/events/SessionMessagesDeleteDomainEvent';
import type { SessionMessageDeleteRecord } from '@/contexts/Core/Session/domain/SessionMessageRepository';
import { PostgresSessionMessageRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionMessageRepository';

const resolveTimestamp = (value?: number | null): Date | null => {
  if (!value) {
    return null;
  }
  const millis = value > 1_000_000_000_000 ? value : value * 1000;
  return new Date(millis);
};

export class PersistSessionMessageDeletesOnSessionMessagesDelete
  implements DomainEventSubscriber<SessionMessagesDeleteDomainEvent>
{
  private readonly repository: PostgresSessionMessageRepository;

  constructor() {
    const pool = new Pool({ connectionString: env.databaseUrl });
    this.repository = new PostgresSessionMessageRepository(pool);
  }

  subscribedTo(): Array<typeof SessionMessagesDeleteDomainEvent> {
    return [SessionMessagesDeleteDomainEvent];
  }

  async on(domainEvent: SessionMessagesDeleteDomainEvent): Promise<void> {
    const now = new Date();

    if (domainEvent.payload.scope === 'chat' && domainEvent.payload.chatJid) {
      await this.repository.markDeletedByChat({
        sessionId: domainEvent.aggregateId,
        chatJid: domainEvent.payload.chatJid,
        deletedAt: now,
        updatedAt: now,
      });
      return;
    }

    const records: SessionMessageDeleteRecord[] = domainEvent.payload.deletes
      .filter((del) => Boolean(del.messageId))
      .map((del) => ({
        sessionId: domainEvent.aggregateId,
        messageId: del.messageId,
        deletedAt: resolveTimestamp(del.deletedAt ?? undefined) ?? now,
        updatedAt: now,
      }));

    await this.repository.markDeleted(records);
  }
}
