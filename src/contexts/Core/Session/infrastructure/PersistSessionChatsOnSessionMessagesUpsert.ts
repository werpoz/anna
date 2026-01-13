import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
import { SessionMessagesUpsertDomainEvent } from '@/contexts/Core/Session/domain/events/SessionMessagesUpsertDomainEvent';
import type { SessionMessageSummary } from '@/contexts/Core/Session/application/SessionProvider';
import type { SessionChatRecord } from '@/contexts/Core/Session/domain/SessionChatRepository';
import { PostgresSessionChatRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionChatRepository';
import { PostgresSessionChatAliasRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionChatAliasRepository';
import { ensureAliases } from '@/contexts/Core/Session/infrastructure/chatAlias';

const resolveTimestamp = (value?: number): Date | null => {
  if (!value) {
    return null;
  }
  const millis = value > 1_000_000_000_000 ? value : value * 1000;
  return new Date(millis);
};

const pickLatestByChat = (messages: SessionMessageSummary[]): Map<string, SessionMessageSummary> => {
  const latest = new Map<string, SessionMessageSummary>();
  for (const message of messages) {
    if (!message.remoteJid) {
      continue;
    }
    const current = latest.get(message.remoteJid);
    if (!current) {
      latest.set(message.remoteJid, message);
      continue;
    }
    const currentTs = current.timestamp ?? 0;
    const nextTs = message.timestamp ?? 0;
    if (nextTs >= currentTs) {
      latest.set(message.remoteJid, message);
    }
  }
  return latest;
};

const toRecord = (
  summary: SessionMessageSummary,
  sessionId: string,
  tenantId: string,
  unreadDelta: number,
  now: Date
): SessionChatRecord | null => {
  if (!summary.remoteJid) {
    return null;
  }

  const displayText = summary.text ?? (summary.type ? `[${summary.type}]` : null);
  return {
    id: crypto.randomUUID(),
    tenantId,
    sessionId,
    chatJid: summary.remoteJid,
    chatName: null,
    lastMessageId: summary.id || null,
    lastMessageTs: resolveTimestamp(summary.timestamp),
    lastMessageText: displayText,
    lastMessageType: summary.type ?? null,
    unreadDelta,
    createdAt: now,
    updatedAt: now,
  };
};

export class PersistSessionChatsOnSessionMessagesUpsert
  implements DomainEventSubscriber<SessionMessagesUpsertDomainEvent> {
  private readonly repository: PostgresSessionChatRepository;
  private readonly chatAliasRepository: PostgresSessionChatAliasRepository;

  constructor() {
    const pool = new Pool({ connectionString: env.databaseUrl });
    this.repository = new PostgresSessionChatRepository(pool);
    this.chatAliasRepository = new PostgresSessionChatAliasRepository(pool);
  }

  subscribedTo(): Array<typeof SessionMessagesUpsertDomainEvent> {
    return [SessionMessagesUpsertDomainEvent];
  }

  async on(domainEvent: SessionMessagesUpsertDomainEvent): Promise<void> {
    const now = new Date();
    const latest = pickLatestByChat(domainEvent.payload.messages);
    const records: SessionChatRecord[] = [];
    const shouldIncrementUnread = domainEvent.payload.upsertType === 'notify';

    const aliases = Array.from(latest.keys());
    await ensureAliases({
      repository: this.chatAliasRepository,
      sessionId: domainEvent.aggregateId,
      tenantId: domainEvent.tenantId,
      aliases,
      now,
    });

    for (const summary of latest.values()) {
      const unreadDelta = shouldIncrementUnread && !summary.fromMe ? 1 : 0;
      const record = toRecord(summary, domainEvent.aggregateId, domainEvent.tenantId, unreadDelta, now);
      if (record) {
        records.push(record);
      }
    }

    await this.repository.upsertMany(records);
  }
}
