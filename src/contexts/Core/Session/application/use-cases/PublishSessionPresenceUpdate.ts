import { SessionPresenceUpdateDomainEvent } from '@/contexts/Core/Session/domain/events/SessionPresenceUpdateDomainEvent';
import type { SessionPresenceUpdatePayload } from '@/contexts/Core/Session/application/SessionProvider';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';

export class PublishSessionPresenceUpdate {
  constructor(private readonly eventBus: EventBus) {}

  async execute(sessionId: string, tenantId: string, payload: SessionPresenceUpdatePayload): Promise<void> {
    const event = new SessionPresenceUpdateDomainEvent({
      aggregateId: sessionId,
      tenantId,
      payload,
    });

    await this.eventBus.publish([event]);
  }
}
