import { StartSession } from '@/contexts/Core/Session/application/use-cases/StartSession';
import { StopSession } from '@/contexts/Core/Session/application/use-cases/StopSession';
import type { SendSessionMessageRequest } from '@/contexts/Core/Session/application/SessionProvider';
import { SendSessionMessage } from '@/contexts/Core/Session/application/use-cases/SendSessionMessage';
import { DeleteSession } from '@/contexts/Core/Session/application/use-cases/DeleteSession';
import { ReadSessionMessages } from '@/contexts/Core/Session/application/use-cases/ReadSessionMessages';
import { EditSessionMessage } from '@/contexts/Core/Session/application/use-cases/EditSessionMessage';
import { DeleteSessionMessage } from '@/contexts/Core/Session/application/use-cases/DeleteSessionMessage';
import { ReactSessionMessage } from '@/contexts/Core/Session/application/use-cases/ReactSessionMessage';

export class SessionService {
  constructor(
    private readonly startSession: StartSession,
    private readonly stopSession: StopSession,
    private readonly sendSessionMessage: SendSessionMessage,
    private readonly deleteSession: DeleteSession,
    private readonly readSessionMessages: ReadSessionMessages,
    private readonly editSessionMessage: EditSessionMessage,
    private readonly deleteSessionMessage: DeleteSessionMessage,
    private readonly reactSessionMessage: ReactSessionMessage
  ) {}

  async start(sessionId: string, tenantId: string): Promise<void> {
    await this.startSession.execute(sessionId, tenantId);
  }

  async stop(sessionId: string, reason?: string): Promise<void> {
    await this.stopSession.execute(sessionId, reason);
  }

  async sendMessage(request: SendSessionMessageRequest): Promise<void> {
    await this.sendSessionMessage.execute(request);
  }

  async delete(sessionId: string): Promise<void> {
    await this.deleteSession.execute(sessionId);
  }

  async readMessages(sessionId: string, messageIds: string[]): Promise<void> {
    await this.readSessionMessages.execute(sessionId, messageIds);
  }

  async editMessage(sessionId: string, messageId: string, content: string): Promise<void> {
    await this.editSessionMessage.execute(sessionId, messageId, content);
  }

  async deleteMessage(sessionId: string, messageId: string): Promise<void> {
    await this.deleteSessionMessage.execute(sessionId, messageId);
  }

  async reactMessage(sessionId: string, messageId: string, emoji: string | null): Promise<void> {
    await this.reactSessionMessage.execute(sessionId, messageId, emoji);
  }
}
