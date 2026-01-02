import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';
import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import { SessionDoesNotExistError } from '@/contexts/Core/Session/domain/errors/SessionDoesNotExistError';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';

export class UpdateSessionQr {
  constructor(
    private readonly repository: SessionRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(sessionId: string, qr: string, expiresAt: Date): Promise<void> {
    const id = new SessionId(sessionId);
    const session = await this.repository.search(id);

    if (!session) {
      throw new SessionDoesNotExistError(id);
    }

    session.updateQr(qr, expiresAt);
    await this.repository.save(session);
    await this.eventBus.publish(session.pullDomainEvents());
  }
}
