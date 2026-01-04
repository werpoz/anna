import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';
import type { SessionMessageRepository } from '@/contexts/Core/Session/domain/SessionMessageRepository';
import type { SessionProvider } from '@/contexts/Core/Session/application/SessionProvider';
import { SessionDoesNotExistError } from '@/contexts/Core/Session/domain/errors/SessionDoesNotExistError';
import { SessionNotConnectedError } from '@/contexts/Core/Session/domain/errors/SessionNotConnectedError';
import { extractSessionMessageKey } from '@/contexts/Core/Session/application/SessionMessageKey';

export class EditSessionMessage {
  constructor(
    private readonly repository: SessionRepository,
    private readonly messageRepository: SessionMessageRepository,
    private readonly provider: SessionProvider
  ) {}

  async execute(sessionId: string, messageId: string, content: string): Promise<void> {
    const id = new SessionId(sessionId);
    const session = await this.repository.search(id);

    if (!session) {
      throw new SessionDoesNotExistError(id);
    }

    if (session.status.value !== 'connected') {
      throw new SessionNotConnectedError(id, session.status.value);
    }

    const raw = await this.messageRepository.findRawByMessageId({ sessionId, messageId });
    const key = extractSessionMessageKey(raw);
    if (!key) {
      throw new Error(`message not found: ${messageId}`);
    }

    await this.provider.editMessage({ sessionId, key, content });
  }
}
