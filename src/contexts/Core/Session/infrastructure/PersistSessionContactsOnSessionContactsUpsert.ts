import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';
import type { DomainEventSubscriber } from '@/contexts/Shared/domain/DomainEventSubscriber';
import { SessionContactsUpsertDomainEvent } from '@/contexts/Core/Session/domain/events/SessionContactsUpsertDomainEvent';
import type { SessionContactRecord } from '@/contexts/Core/Session/domain/SessionContactRepository';
import { PostgresSessionContactRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionContactRepository';

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

  constructor() {
    const pool = new Pool({ connectionString: env.databaseUrl });
    this.repository = new PostgresSessionContactRepository(pool);
  }

  subscribedTo(): Array<typeof SessionContactsUpsertDomainEvent> {
    return [SessionContactsUpsertDomainEvent];
  }

  async on(domainEvent: SessionContactsUpsertDomainEvent): Promise<void> {
    const now = new Date();
    const records = domainEvent.payload.contacts
      .filter((contact) => Boolean(contact.id))
      .map((contact) => toRecord(contact, domainEvent.aggregateId, domainEvent.tenantId, now));

    await this.repository.upsertMany(records);
  }
}
