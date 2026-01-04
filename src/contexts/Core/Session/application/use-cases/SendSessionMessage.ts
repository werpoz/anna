import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';
import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import { SessionDoesNotExistError } from '@/contexts/Core/Session/domain/errors/SessionDoesNotExistError';
import { SessionNotConnectedError } from '@/contexts/Core/Session/domain/errors/SessionNotConnectedError';
import type {
  SessionProvider,
  SendSessionMessageRequest,
} from '@/contexts/Core/Session/application/SessionProvider';
import type { SessionMessageRepository } from '@/contexts/Core/Session/domain/SessionMessageRepository';

export class SendSessionMessage {
  constructor(
    private readonly repository: SessionRepository,
    private readonly messageRepository: SessionMessageRepository,
    private readonly provider: SessionProvider
  ) {}

  async execute(request: SendSessionMessageRequest): Promise<void> {
    if (request.replyToMessageId && request.forwardMessageId) {
      throw new Error('replyToMessageId and forwardMessageId are mutually exclusive');
    }

    const id = new SessionId(request.sessionId);
    const session = await this.repository.search(id);

    if (!session) {
      throw new SessionDoesNotExistError(id);
    }

    if (session.status.value !== 'connected') {
      throw new SessionNotConnectedError(id, session.status.value);
    }

    let quotedMessage: Record<string, unknown> | null = null;
    let forwardMessage: Record<string, unknown> | null = null;

    if (request.replyToMessageId) {
      quotedMessage = await this.messageRepository.findRawByMessageId({
        sessionId: request.sessionId,
        messageId: request.replyToMessageId,
      });
      if (!quotedMessage) {
        throw new Error(`reply message not found: ${request.replyToMessageId}`);
      }
    }

    if (request.forwardMessageId) {
      forwardMessage = await this.messageRepository.findRawByMessageId({
        sessionId: request.sessionId,
        messageId: request.forwardMessageId,
      });
      if (!forwardMessage) {
        throw new Error(`forward message not found: ${request.forwardMessageId}`);
      }
    }

    await this.provider.sendMessage({
      ...request,
      quotedMessage,
      forwardMessage,
    });
  }
}
