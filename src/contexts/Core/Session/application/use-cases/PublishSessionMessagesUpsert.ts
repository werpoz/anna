import type { EventBus } from '@/contexts/Shared/domain/EventBus';
import { SessionMessagesUpsertDomainEvent } from '@/contexts/Core/Session/domain/events/SessionMessagesUpsertDomainEvent';
import type { SessionMessagesUpsertPayload } from '@/contexts/Core/Session/application/SessionProvider';

export class PublishSessionMessagesUpsert {
  constructor(private readonly eventBus: EventBus) {}

  async execute(sessionId: string, tenantId: string, payload: SessionMessagesUpsertPayload): Promise<void> {
    const event = new SessionMessagesUpsertDomainEvent({
      aggregateId: sessionId,
      tenantId,
      payload,
    });
    await this.eventBus.publish([event]);
  }
}
