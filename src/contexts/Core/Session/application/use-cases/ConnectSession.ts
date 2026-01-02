import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';
import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import { SessionPhone } from '@/contexts/Core/Session/domain/SessionPhone';
import { SessionDoesNotExistError } from '@/contexts/Core/Session/domain/errors/SessionDoesNotExistError';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';

export class ConnectSession {
  constructor(
    private readonly repository: SessionRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(sessionId: string, phone: string, connectedAt: Date): Promise<void> {
    const id = new SessionId(sessionId);
    const session = await this.repository.search(id);

    if (!session) {
      throw new SessionDoesNotExistError(id);
    }

    session.connect(new SessionPhone(phone), connectedAt);
    await this.repository.save(session);
    await this.eventBus.publish(session.pullDomainEvents());
  }
}
