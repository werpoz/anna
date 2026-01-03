import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';
import type { SessionAuthRepository } from '@/contexts/Core/Session/domain/SessionAuthRepository';
import type { SessionProvider } from '@/contexts/Core/Session/application/SessionProvider';

export class DeleteSession {
  constructor(
    private readonly repository: SessionRepository,
    private readonly authRepository: SessionAuthRepository,
    private readonly provider: SessionProvider
  ) {}

  async execute(sessionId: string): Promise<void> {
    const id = new SessionId(sessionId);

    await this.provider.stop(sessionId);
    await this.repository.delete(id);
    await this.authRepository.delete(id);
  }
}
