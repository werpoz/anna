import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
import { SessionHistorySyncDomainEvent } from '@/contexts/Core/Session/domain/events/SessionHistorySyncDomainEvent';
import type { SessionMessageSummary } from '@/contexts/Core/Session/application/SessionProvider';
import type { SessionMessageRecord } from '@/contexts/Core/Session/domain/SessionMessageRepository';
import { PostgresSessionMessageRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionMessageRepository';
import { PostgresSessionChatAliasRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionChatAliasRepository';
import { ensureAliases } from '@/contexts/Core/Session/infrastructure/chatAlias';

const resolveTimestamp = (value?: number): Date | null => {
  if (!value) {
    return null;
  }
  // Baileys suele entregar segundos; si parece ms, lo respetamos.
  const millis = value > 1_000_000_000_000 ? value : value * 1000;
  return new Date(millis);
};

const toRecord = (
  summary: SessionMessageSummary,
  sessionId: string,
  tenantId: string,
  now: Date
): SessionMessageRecord | null => {
  if (!summary.id || !summary.remoteJid) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    tenantId,
    sessionId,
    chatJid: summary.remoteJid,
    messageId: summary.id,
    fromMe: summary.fromMe ?? false,
    senderJid: summary.participant ?? null,
    timestamp: resolveTimestamp(summary.timestamp),
    type: summary.type ?? null,
    text: summary.text ?? null,
    raw: summary.raw ?? null,
    status: summary.status ?? null,
    statusAt: resolveTimestamp(summary.statusAt),
    isEdited: false,
    editedAt: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
};

export class PersistSessionHistoryOnSessionHistorySync
  implements DomainEventSubscriber<SessionHistorySyncDomainEvent>
{
  private readonly repository: PostgresSessionMessageRepository;
  private readonly chatAliasRepository: PostgresSessionChatAliasRepository;

  constructor() {
    const pool = new Pool({ connectionString: env.databaseUrl });
    this.repository = new PostgresSessionMessageRepository(pool);
    this.chatAliasRepository = new PostgresSessionChatAliasRepository(pool);
  }

  subscribedTo(): Array<typeof SessionHistorySyncDomainEvent> {
    return [SessionHistorySyncDomainEvent];
  }

  async on(domainEvent: SessionHistorySyncDomainEvent): Promise<void> {
    const now = new Date();
    const records = domainEvent.payload.messages
      .map((summary) => toRecord(summary, domainEvent.aggregateId, domainEvent.tenantId, now))
      .filter((record): record is SessionMessageRecord => Boolean(record));

    await ensureAliases({
      repository: this.chatAliasRepository,
      sessionId: domainEvent.aggregateId,
      tenantId: domainEvent.tenantId,
      aliases: records.map((record) => record.chatJid),
      now,
    });

    await this.repository.upsertMany(records);
  }
}
