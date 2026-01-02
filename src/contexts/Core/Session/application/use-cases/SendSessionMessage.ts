import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';
import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import { SessionDoesNotExistError } from '@/contexts/Core/Session/domain/errors/SessionDoesNotExistError';
import { SessionNotConnectedError } from '@/contexts/Core/Session/domain/errors/SessionNotConnectedError';
import type {
  SessionProvider,
  SendSessionMessageRequest,
} from '@/contexts/Core/Session/application/SessionProvider';

export class SendSessionMessage {
  constructor(
    private readonly repository: SessionRepository,
    private readonly provider: SessionProvider
  ) {}

  async execute(request: SendSessionMessageRequest): Promise<void> {
    const id = new SessionId(request.sessionId);
    const session = await this.repository.search(id);

    if (!session) {
      throw new SessionDoesNotExistError(id);
    }

    if (session.status.value !== 'connected') {
      throw new SessionNotConnectedError(id, session.status.value);
    }

    await this.provider.sendMessage(request);
  }
}
