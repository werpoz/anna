import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import type { SessionStatusValue } from '@/contexts/Core/Session/domain/SessionStatus';

export class SessionNotConnectedError extends Error {
  constructor(sessionId: SessionId, status: SessionStatusValue) {
    super(`Session <${sessionId.value}> is not connected (status: ${status})`);
  }
}
