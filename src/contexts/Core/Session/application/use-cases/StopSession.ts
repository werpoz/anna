import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';
import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import { SessionDoesNotExistError } from '@/contexts/Core/Session/domain/errors/SessionDoesNotExistError';
import type { SessionProvider } from '@/contexts/Core/Session/application/SessionProvider';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';

const DEFAULT_STOP_REASON = 'stopped';

export class StopSession {
  constructor(
    private readonly repository: SessionRepository,
    private readonly eventBus: EventBus,
    private readonly provider: SessionProvider
  ) {}

  async execute(sessionId: string, reason: string = DEFAULT_STOP_REASON): Promise<void> {
    const id = new SessionId(sessionId);
    const session = await this.repository.search(id);

    if (!session) {
      throw new SessionDoesNotExistError(id);
    }

    if (session.status.value === 'connected') {
      session.disconnect(reason);
      await this.repository.save(session);
      await this.eventBus.publish(session.pullDomainEvents());
    }

    await this.provider.stop(sessionId);
  }
}
