import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';
import type { SessionAuthRepository } from '@/contexts/Core/Session/domain/SessionAuthRepository';
import type { SessionMessageRepository } from '@/contexts/Core/Session/domain/SessionMessageRepository';
import type { SessionChatRepository } from '@/contexts/Core/Session/domain/SessionChatRepository';
import type { SessionProvider } from '@/contexts/Core/Session/application/SessionProvider';

export class DeleteSession {
  constructor(
    private readonly repository: SessionRepository,
    private readonly authRepository: SessionAuthRepository,
    private readonly messageRepository: SessionMessageRepository,
    private readonly chatRepository: SessionChatRepository,
    private readonly provider: SessionProvider
  ) {}

  async execute(sessionId: string): Promise<void> {
    const id = new SessionId(sessionId);

    await this.provider.stop(sessionId);
    await this.messageRepository.deleteBySession(id.value);
    await this.chatRepository.deleteBySession(id.value);
    await this.repository.delete(id);
    await this.authRepository.delete(id);
  }
}
