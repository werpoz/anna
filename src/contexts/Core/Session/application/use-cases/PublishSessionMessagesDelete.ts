import { SessionMessagesDeleteDomainEvent } from '@/contexts/Core/Session/domain/events/SessionMessagesDeleteDomainEvent';
import type { SessionMessagesDeletePayload } from '@/contexts/Core/Session/application/SessionProvider';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';

export class PublishSessionMessagesDelete {
  constructor(private readonly eventBus: EventBus) {}

  async execute(sessionId: string, tenantId: string, payload: SessionMessagesDeletePayload): Promise<void> {
    const event = new SessionMessagesDeleteDomainEvent({
      aggregateId: sessionId,
      tenantId,
      payload,
    });

    await this.eventBus.publish([event]);
  }
}
