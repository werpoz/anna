import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
import { SessionMessagesMediaDomainEvent } from '@/contexts/Core/Session/domain/events/SessionMessagesMediaDomainEvent';
import type { SessionMessageMediaRecord } from '@/contexts/Core/Session/domain/SessionMessageMediaRepository';
import { PostgresSessionMessageMediaRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionMessageMediaRepository';

const resolveTimestamp = (value?: number | null): Date | null => {
  if (!value) {
    return null;
  }
  const millis = value > 1_000_000_000_000 ? value : value * 1000;
  return new Date(millis);
};

export class PersistSessionMessageMediaOnSessionMessagesMedia
  implements DomainEventSubscriber<SessionMessagesMediaDomainEvent>
{
  private readonly repository: PostgresSessionMessageMediaRepository;

  constructor() {
    const pool = new Pool({ connectionString: env.databaseUrl });
    this.repository = new PostgresSessionMessageMediaRepository(pool);
  }

  subscribedTo(): Array<typeof SessionMessagesMediaDomainEvent> {
    return [SessionMessagesMediaDomainEvent];
  }

  async on(domainEvent: SessionMessagesMediaDomainEvent): Promise<void> {
    const now = new Date();
    const records: SessionMessageMediaRecord[] = domainEvent.payload.media
      .filter((media) => Boolean(media.messageId) && Boolean(media.chatJid) && Boolean(media.kind))
      .map((media) => ({
        id: crypto.randomUUID(),
        tenantId: domainEvent.tenantId,
        sessionId: domainEvent.aggregateId,
        chatJid: media.chatJid ?? '',
        messageId: media.messageId,
        kind: media.kind,
        mime: media.mime ?? null,
        size: media.size ?? null,
        fileName: media.fileName ?? null,
        url: media.url ?? '',
        sha256: media.sha256 ?? null,
        width: media.width ?? null,
        height: media.height ?? null,
        duration: media.duration ?? null,
        createdAt: now,
        updatedAt: now,
      }))
      .filter((record) => Boolean(record.url));

    await this.repository.upsertMany(records);
  }
}
