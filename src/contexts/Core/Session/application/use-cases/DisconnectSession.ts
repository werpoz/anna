import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';
import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import { SessionDoesNotExistError } from '@/contexts/Core/Session/domain/errors/SessionDoesNotExistError';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';

export class DisconnectSession {
  constructor(
    private readonly repository: SessionRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(sessionId: string, reason: string, disconnectedAt: Date): Promise<void> {
    const id = new SessionId(sessionId);
    const session = await this.repository.search(id);

    if (!session) {
      throw new SessionDoesNotExistError(id);
    }

    session.disconnect(reason, disconnectedAt);
    await this.repository.save(session);
    await this.eventBus.publish(session.pullDomainEvents());
  }
}
