import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
import { SessionContactsUpsertDomainEvent } from '@/contexts/Core/Session/domain/events/SessionContactsUpsertDomainEvent';
import type { SessionContactRecord } from '@/contexts/Core/Session/domain/SessionContactRepository';
import { PostgresSessionContactRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionContactRepository';
import { PostgresSessionChatAliasRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionChatAliasRepository';
import { resolveAliasType } from '@/contexts/Core/Session/infrastructure/chatAlias';

const toRecord = (
  contact: {
    id: string;
    lid?: string;
    phoneNumber?: string;
    name?: string;
    notify?: string;
    verifiedName?: string;
    imgUrl?: string | null;
    status?: string;
  },
  sessionId: string,
  tenantId: string,
  now: Date
): SessionContactRecord => ({
  id: crypto.randomUUID(),
  tenantId,
  sessionId,
  contactJid: contact.id,
  contactLid: contact.lid ?? null,
  phoneNumber: contact.phoneNumber ?? null,
  name: contact.name ?? null,
  notify: contact.notify ?? null,
  verifiedName: contact.verifiedName ?? null,
  imgUrl: contact.imgUrl ?? null,
  status: contact.status ?? null,
  createdAt: now,
  updatedAt: now,
});

export class PersistSessionContactsOnSessionContactsUpsert
  implements DomainEventSubscriber<SessionContactsUpsertDomainEvent>
{
  private readonly repository: PostgresSessionContactRepository;
  private readonly chatAliasRepository: PostgresSessionChatAliasRepository;

  constructor() {
    const pool = new Pool({ connectionString: env.databaseUrl });
    this.repository = new PostgresSessionContactRepository(pool);
    this.chatAliasRepository = new PostgresSessionChatAliasRepository(pool);
  }

  subscribedTo(): Array<typeof SessionContactsUpsertDomainEvent> {
    return [SessionContactsUpsertDomainEvent];
  }

  async on(domainEvent: SessionContactsUpsertDomainEvent): Promise<void> {
    const now = new Date();
    const contacts = domainEvent.payload.contacts.filter((contact) => Boolean(contact.id));
    const records = contacts.map((contact) =>
      toRecord(contact, domainEvent.aggregateId, domainEvent.tenantId, now)
    );

    const aliases: string[] = [];
    for (const contact of contacts) {
      if (contact.id) {
        aliases.push(contact.id);
      }
      if (contact.lid) {
        aliases.push(contact.lid);
      }
    }

    const existing = await this.chatAliasRepository.resolveMany({
      sessionId: domainEvent.aggregateId,
      aliases,
    });

    const upserts = new Map<string, { chatKey: string; aliasType: ReturnType<typeof resolveAliasType> }>();
    const merges: Array<{ from: string; to: string }> = [];

    for (const contact of contacts) {
      if (!contact.id) {
        continue;
      }
      let chatKey = existing.get(contact.id);
      if (!chatKey) {
        chatKey = crypto.randomUUID();
        existing.set(contact.id, chatKey);
        upserts.set(contact.id, { chatKey, aliasType: resolveAliasType(contact.id) });
      }

      if (contact.lid) {
        const lidKey = existing.get(contact.lid);
        if (lidKey && lidKey !== chatKey) {
          merges.push({ from: lidKey, to: chatKey });
        }
        existing.set(contact.lid, chatKey);
        upserts.set(contact.lid, { chatKey, aliasType: resolveAliasType(contact.lid) });
      }
    }

    for (const merge of merges) {
      await this.chatAliasRepository.mergeChatKeys({
        sessionId: domainEvent.aggregateId,
        fromChatKey: merge.from,
        toChatKey: merge.to,
      });
    }

    if (upserts.size) {
      const aliasRecords = Array.from(upserts.entries()).map(([alias, data]) => ({
        id: crypto.randomUUID(),
        tenantId: domainEvent.tenantId,
        sessionId: domainEvent.aggregateId,
        chatKey: data.chatKey,
        alias,
        aliasType: data.aliasType,
        createdAt: now,
        updatedAt: now,
      }));
      await this.chatAliasRepository.upsertMany(aliasRecords);
    }

    await this.repository.upsertMany(records);
  }
}
