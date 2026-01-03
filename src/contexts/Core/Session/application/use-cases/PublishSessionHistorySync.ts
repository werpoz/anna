import type { EventBus } from '@/contexts/Shared/domain/EventBus';
import { SessionHistorySyncDomainEvent } from '@/contexts/Core/Session/domain/events/SessionHistorySyncDomainEvent';
import type { SessionHistorySyncPayload } from '@/contexts/Core/Session/application/SessionProvider';

export class PublishSessionHistorySync {
  constructor(private readonly eventBus: EventBus) {}

  async execute(sessionId: string, tenantId: string, payload: SessionHistorySyncPayload): Promise<void> {
    const event = new SessionHistorySyncDomainEvent({
      aggregateId: sessionId,
      tenantId,
      payload,
    });
    await this.eventBus.publish([event]);
  }
}
