import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
import { SessionChatsUpsertDomainEvent } from '@/contexts/Core/Session/domain/events/SessionChatsUpsertDomainEvent';
import { SessionChatsUpdateDomainEvent } from '@/contexts/Core/Session/domain/events/SessionChatsUpdateDomainEvent';
import type { SessionChatRecord } from '@/contexts/Core/Session/domain/SessionChatRepository';
import { PostgresSessionChatRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionChatRepository';
import type { SessionChatSummary } from '@/contexts/Core/Session/application/SessionProvider';

const toRecord = (
    chat: SessionChatSummary | (Partial<SessionChatSummary> & { id: string }),
    sessionId: string,
    tenantId: string,
    now: Date
): SessionChatRecord => {
    return {
        id: crypto.randomUUID(),
        tenantId,
        sessionId,
        chatJid: chat.id,
        chatName: chat.name ?? null,
        lastMessageId: null, // Upsert doesn't imply message update necessarily, or we don't know it here
        lastMessageTs: chat.createdAt ? new Date(chat.createdAt) : null,
        lastMessageText: null,
        lastMessageType: null,
        unreadDelta: chat.unreadCount ?? 0,
        createdAt: now,
        updatedAt: now,
    };
};

export class PersistSessionChatsOnSessionChatsUpsert
    implements DomainEventSubscriber<SessionChatsUpsertDomainEvent | SessionChatsUpdateDomainEvent> {
    private readonly repository: PostgresSessionChatRepository;

    constructor() {
        const pool = new Pool({ connectionString: env.databaseUrl });
        this.repository = new PostgresSessionChatRepository(pool);
    }

    subscribedTo(): Array<typeof SessionChatsUpsertDomainEvent | typeof SessionChatsUpdateDomainEvent> {
        return [SessionChatsUpsertDomainEvent, SessionChatsUpdateDomainEvent];
    }

    async on(domainEvent: SessionChatsUpsertDomainEvent | SessionChatsUpdateDomainEvent): Promise<void> {
        const now = new Date();
        const chats = domainEvent.payload.chats;
        const records: SessionChatRecord[] = [];

        for (const chat of chats) {
            records.push(toRecord(chat, domainEvent.aggregateId, domainEvent.tenantId, now));
        }

        if (records.length > 0) {
            // We use upsert, so it handles both insert and update (for existing chats)
            await this.repository.upsertMany(records);
        }
    }
}
