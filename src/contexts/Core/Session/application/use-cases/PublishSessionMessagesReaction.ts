import { SessionMessagesReactionDomainEvent } from '@/contexts/Core/Session/domain/events/SessionMessagesReactionDomainEvent';
import type { SessionMessagesReactionPayload } from '@/contexts/Core/Session/application/SessionProvider';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';

export class PublishSessionMessagesReaction {
  constructor(private readonly eventBus: EventBus) {}

  async execute(sessionId: string, tenantId: string, payload: SessionMessagesReactionPayload): Promise<void> {
    const event = new SessionMessagesReactionDomainEvent({
      aggregateId: sessionId,
      tenantId,
      payload,
    });

    await this.eventBus.publish([event]);
  }
}
