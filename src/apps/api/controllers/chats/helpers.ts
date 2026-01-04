import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import { SessionTenantId } from '@/contexts/Core/Session/domain/SessionTenantId';
import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';

export const resolveSessionIdForTenant = async (
  repository: SessionRepository,
  tenantId: string,
  sessionId?: string
): Promise<string | null> => {
  if (sessionId) {
    const session = await repository.search(new SessionId(sessionId));
    if (!session || session.tenantId.value !== tenantId) {
      return null;
    }
    return session.id.value;
  }

  const sessions = await repository.searchByTenant(new SessionTenantId(tenantId));
  if (!sessions.length) {
    return null;
  }

  const connected = sessions.find((item) => item.status.value === 'connected');
  return (connected ?? sessions[0]).id.value;
};
