import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
import { SessionMessagesReactionDomainEvent } from '@/contexts/Core/Session/domain/events/SessionMessagesReactionDomainEvent';
import type { SessionMessageReactionRecord } from '@/contexts/Core/Session/domain/SessionMessageReactionRepository';
import { PostgresSessionMessageReactionRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionMessageReactionRepository';
import { PostgresSessionChatAliasRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionChatAliasRepository';
import { ensureAliases } from '@/contexts/Core/Session/infrastructure/chatAlias';

const resolveTimestamp = (value?: number | null): Date | null => {
  if (!value) {
    return null;
  }
  const millis = value > 1_000_000_000_000 ? value : value * 1000;
  return new Date(millis);
};

export class PersistSessionMessageReactionsOnSessionMessagesReaction
  implements DomainEventSubscriber<SessionMessagesReactionDomainEvent>
{
  private readonly repository: PostgresSessionMessageReactionRepository;
  private readonly chatAliasRepository: PostgresSessionChatAliasRepository;

  constructor() {
    const pool = new Pool({ connectionString: env.databaseUrl });
    this.repository = new PostgresSessionMessageReactionRepository(pool);
    this.chatAliasRepository = new PostgresSessionChatAliasRepository(pool);
  }

  subscribedTo(): Array<typeof SessionMessagesReactionDomainEvent> {
    return [SessionMessagesReactionDomainEvent];
  }

  async on(domainEvent: SessionMessagesReactionDomainEvent): Promise<void> {
    const now = new Date();
    const records: SessionMessageReactionRecord[] = domainEvent.payload.reactions
      .filter(
        (reaction) => Boolean(reaction.messageId) && Boolean(reaction.chatJid) && Boolean(reaction.actorJid)
      )
      .map((reaction) => ({
        id: crypto.randomUUID(),
        tenantId: domainEvent.tenantId,
        sessionId: domainEvent.aggregateId,
        chatJid: reaction.chatJid ?? '',
        messageId: reaction.messageId,
        actorJid: reaction.actorJid ?? '',
        fromMe: reaction.fromMe ?? false,
        emoji: reaction.emoji ?? null,
        reactedAt: resolveTimestamp(reaction.reactedAt ?? undefined) ?? now,
        isRemoved: reaction.removed ?? false,
        createdAt: now,
        updatedAt: now,
      }));

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
