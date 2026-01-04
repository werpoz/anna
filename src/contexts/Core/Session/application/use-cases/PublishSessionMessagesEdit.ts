import { SessionMessagesEditDomainEvent } from '@/contexts/Core/Session/domain/events/SessionMessagesEditDomainEvent';
import type { SessionMessagesEditPayload } from '@/contexts/Core/Session/application/SessionProvider';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';

export class PublishSessionMessagesEdit {
  constructor(private readonly eventBus: EventBus) {}

  async execute(sessionId: string, tenantId: string, payload: SessionMessagesEditPayload): Promise<void> {
    const event = new SessionMessagesEditDomainEvent({
      aggregateId: sessionId,
      tenantId,
      payload,
    });

    await this.eventBus.publish([event]);
  }
}
