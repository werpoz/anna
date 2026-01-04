import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
import { SessionMessagesEditDomainEvent } from '@/contexts/Core/Session/domain/events/SessionMessagesEditDomainEvent';
import type { SessionMessageEditRecord } from '@/contexts/Core/Session/domain/SessionMessageRepository';
import { PostgresSessionMessageRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionMessageRepository';

const resolveTimestamp = (value?: number | null): Date | null => {
  if (!value) {
    return null;
  }
  const millis = value > 1_000_000_000_000 ? value : value * 1000;
  return new Date(millis);
};

export class PersistSessionMessageEditsOnSessionMessagesEdit
  implements DomainEventSubscriber<SessionMessagesEditDomainEvent>
{
  private readonly repository: PostgresSessionMessageRepository;

  constructor() {
    const pool = new Pool({ connectionString: env.databaseUrl });
    this.repository = new PostgresSessionMessageRepository(pool);
  }

  subscribedTo(): Array<typeof SessionMessagesEditDomainEvent> {
    return [SessionMessagesEditDomainEvent];
  }

  async on(domainEvent: SessionMessagesEditDomainEvent): Promise<void> {
    const now = new Date();
    const records: SessionMessageEditRecord[] = domainEvent.payload.edits
      .filter((edit) => Boolean(edit.messageId))
      .map((edit) => ({
        sessionId: domainEvent.aggregateId,
        messageId: edit.messageId,
        type: edit.type ?? null,
        text: edit.text ?? null,
        editedAt: resolveTimestamp(edit.editedAt ?? undefined) ?? now,
        updatedAt: now,
      }));

    await this.repository.updateEdits(records);
  }
}
