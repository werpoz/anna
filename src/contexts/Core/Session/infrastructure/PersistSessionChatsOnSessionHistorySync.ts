import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
import { SessionHistorySyncDomainEvent } from '@/contexts/Core/Session/domain/events/SessionHistorySyncDomainEvent';
import type { SessionMessageSummary, SessionChatSummary } from '@/contexts/Core/Session/application/SessionProvider';
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

// ... imports

const toRecord = (
  summary: SessionMessageSummary,
  chatSummary: SessionChatSummary | undefined, // Added arg
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
    chatName: chatSummary?.name ?? null, // Use chat name
    lastMessageId: summary.id || null,
    lastMessageTs: resolveTimestamp(summary.timestamp),
    lastMessageText: displayText,
    lastMessageType: summary.type ?? null,
    unreadDelta: chatSummary?.unreadCount || 0, // Use unread count from chat summary if available
    createdAt: now,
    updatedAt: now,
  };
};

export class PersistSessionChatsOnSessionHistorySync
  implements DomainEventSubscriber<SessionHistorySyncDomainEvent> {
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
    const chats = new Map(domainEvent.payload.chats?.map(c => [c.id, c]) ?? []); // Map chats by ID
    const records: SessionChatRecord[] = [];

    // Process messages (which imply chats)
    for (const summary of latest.values()) {
      const chatSummary = summary.remoteJid ? chats.get(summary.remoteJid) : undefined;
      const record = toRecord(summary, chatSummary, domainEvent.aggregateId, domainEvent.tenantId, now);
      if (record) {
        records.push(record);
      }
      // Remove from map to track processed chats
      if (summary.remoteJid) chats.delete(summary.remoteJid);
    }

    // Process remaining chats that might not have messages in the sync (unlikely but possible)
    // Actually, history sync usually pairs them. But if there are empty chats with metadata, we might want them.
    for (const chat of chats.values()) {
      records.push({
        id: crypto.randomUUID(),
        tenantId: domainEvent.tenantId,
        sessionId: domainEvent.aggregateId,
        chatJid: chat.id,
        chatName: chat.name ?? null,
        lastMessageId: null,
        lastMessageTs: chat.createdAt ? new Date(chat.createdAt) : null,
        lastMessageText: null,
        lastMessageType: null,
        unreadDelta: chat.unreadCount || 0,
        createdAt: now,
        updatedAt: now
      });
    }

    await this.repository.upsertMany(records);
  }
}

