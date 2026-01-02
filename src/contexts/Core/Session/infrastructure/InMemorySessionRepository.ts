import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';
import type { Session } from '@/contexts/Core/Session/domain/Session';
import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import { SessionTenantId } from '@/contexts/Core/Session/domain/SessionTenantId';
import { injectable } from 'tsyringe';

@injectable()
export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions: Map<string, Session>;

  constructor() {
    this.sessions = new Map();
  }

  async save(session: Session): Promise<void> {
    this.sessions.set(session.id.value, session);
  }

  async search(id: SessionId): Promise<Session | null> {
    return this.sessions.get(id.value) ?? null;
  }

  async searchByTenant(tenantId: SessionTenantId): Promise<Session[]> {
    const items: Session[] = [];
    for (const session of this.sessions.values()) {
      if (session.tenantId.value === tenantId.value) {
        items.push(session);
      }
    }
    return items;
  }
}
