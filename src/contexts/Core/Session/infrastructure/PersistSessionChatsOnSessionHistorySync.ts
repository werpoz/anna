import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
import { SessionHistorySyncDomainEvent } from '@/contexts/Core/Session/domain/events/SessionHistorySyncDomainEvent';
import type { SessionMessageSummary } from '@/contexts/Core/Session/application/SessionProvider';
import type { SessionChatRecord } from '@/contexts/Core/Session/domain/SessionChatRepository';
import { PostgresSessionChatRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionChatRepository';

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
    unreadDelta: 0,
    createdAt: now,
    updatedAt: now,
  };
};

export class PersistSessionChatsOnSessionHistorySync
  implements DomainEventSubscriber<SessionHistorySyncDomainEvent>
{
  private readonly repository: PostgresSessionChatRepository;

  constructor() {
    const pool = new Pool({ connectionString: env.databaseUrl });
    this.repository = new PostgresSessionChatRepository(pool);
  }

  subscribedTo(): Array<typeof SessionHistorySyncDomainEvent> {
    return [SessionHistorySyncDomainEvent];
  }

  async on(domainEvent: SessionHistorySyncDomainEvent): Promise<void> {
    const now = new Date();
    const latest = pickLatestByChat(domainEvent.payload.messages);
    const records: SessionChatRecord[] = [];

    for (const summary of latest.values()) {
      const record = toRecord(summary, domainEvent.aggregateId, domainEvent.tenantId, now);
      if (record) {
        records.push(record);
      }
    }

    await this.repository.upsertMany(records);
  }
}
