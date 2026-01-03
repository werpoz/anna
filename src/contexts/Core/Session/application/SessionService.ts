import { StartSession } from '@/contexts/Core/Session/application/use-cases/StartSession';
import { StopSession } from '@/contexts/Core/Session/application/use-cases/StopSession';
import type { SendSessionMessageRequest } from '@/contexts/Core/Session/application/SessionProvider';
import { SendSessionMessage } from '@/contexts/Core/Session/application/use-cases/SendSessionMessage';
import { DeleteSession } from '@/contexts/Core/Session/application/use-cases/DeleteSession';

export class SessionService {
  constructor(
    private readonly startSession: StartSession,
    private readonly stopSession: StopSession,
    private readonly sendSessionMessage: SendSessionMessage,
    private readonly deleteSession: DeleteSession
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
}
