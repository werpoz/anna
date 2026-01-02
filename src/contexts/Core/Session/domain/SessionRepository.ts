import type { Session } from '@/contexts/Core/Session/domain/Session';
import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import { SessionTenantId } from '@/contexts/Core/Session/domain/SessionTenantId';

export interface SessionRepository {
  save(session: Session): Promise<void>;
  search(id: SessionId): Promise<Session | null>;
  searchByTenant(tenantId: SessionTenantId): Promise<Session[]>;
}
