import { SessionMessagesUpdateDomainEvent } from '@/contexts/Core/Session/domain/events/SessionMessagesUpdateDomainEvent';
import type { SessionMessagesUpdatePayload } from '@/contexts/Core/Session/application/SessionProvider';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';

export class PublishSessionMessagesUpdate {
  constructor(private readonly eventBus: EventBus) {}

  async execute(sessionId: string, tenantId: string, payload: SessionMessagesUpdatePayload): Promise<void> {
    const event = new SessionMessagesUpdateDomainEvent({
      aggregateId: sessionId,
      tenantId,
      payload,
    });

    await this.eventBus.publish([event]);
  }
}
