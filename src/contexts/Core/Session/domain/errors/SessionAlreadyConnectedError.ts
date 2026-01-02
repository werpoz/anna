import { SessionId } from '@/contexts/Core/Session/domain/SessionId';

export class SessionAlreadyConnectedError extends Error {
  constructor(sessionId: SessionId) {
    super(`Session <${sessionId.value}> is already connected`);
  }
}
