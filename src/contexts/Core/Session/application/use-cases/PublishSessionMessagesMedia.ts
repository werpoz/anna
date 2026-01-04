import { SessionMessagesMediaDomainEvent } from '@/contexts/Core/Session/domain/events/SessionMessagesMediaDomainEvent';
import type { SessionMessagesMediaPayload } from '@/contexts/Core/Session/application/SessionProvider';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';

export class PublishSessionMessagesMedia {
  constructor(private readonly eventBus: EventBus) {}

  async execute(sessionId: string, tenantId: string, payload: SessionMessagesMediaPayload): Promise<void> {
    const event = new SessionMessagesMediaDomainEvent({
      aggregateId: sessionId,
      tenantId,
      payload,
    });

    await this.eventBus.publish([event]);
  }
}
