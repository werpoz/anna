import { SessionContactsUpsertDomainEvent } from '@/contexts/Core/Session/domain/events/SessionContactsUpsertDomainEvent';
import type { SessionContactsUpsertPayload } from '@/contexts/Core/Session/application/SessionProvider';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';

export class PublishSessionContactsUpsert {
  constructor(private readonly eventBus: EventBus) {}

  async execute(sessionId: string, tenantId: string, payload: SessionContactsUpsertPayload): Promise<void> {
    const event = new SessionContactsUpsertDomainEvent({
      aggregateId: sessionId,
      tenantId,
      payload,
    });

    await this.eventBus.publish([event]);
  }
}
