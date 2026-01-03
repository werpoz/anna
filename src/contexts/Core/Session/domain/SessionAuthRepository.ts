import type { SessionId } from '@/contexts/Core/Session/domain/SessionId';

export interface SessionAuthRepository {
  delete(sessionId: SessionId): Promise<void>;
}
