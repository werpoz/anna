import { Session } from '@/contexts/Core/Session/domain/Session';
import { SessionId } from '@/contexts/Core/Session/domain/SessionId';
import { SessionTenantId } from '@/contexts/Core/Session/domain/SessionTenantId';
import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';
import type { SessionProvider } from '@/contexts/Core/Session/application/SessionProvider';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';
import { UpdateSessionQr } from '@/contexts/Core/Session/application/use-cases/UpdateSessionQr';
import { ConnectSession } from '@/contexts/Core/Session/application/use-cases/ConnectSession';
import { DisconnectSession } from '@/contexts/Core/Session/application/use-cases/DisconnectSession';
import { PublishSessionHistorySync } from '@/contexts/Core/Session/application/use-cases/PublishSessionHistorySync';
import { PublishSessionMessagesUpsert } from '@/contexts/Core/Session/application/use-cases/PublishSessionMessagesUpsert';

export class StartSession {
  constructor(
    private readonly repository: SessionRepository,
    private readonly eventBus: EventBus,
    private readonly provider: SessionProvider,
    private readonly updateSessionQr: UpdateSessionQr,
    private readonly connectSession: ConnectSession,
    private readonly disconnectSession: DisconnectSession,
    private readonly publishSessionHistorySync: PublishSessionHistorySync,
    private readonly publishSessionMessagesUpsert: PublishSessionMessagesUpsert
  ) {}

  async execute(sessionId: string, tenantId: string): Promise<void> {
    const id = new SessionId(sessionId);
    const existing = await this.repository.search(id);
    const resolvedTenantId = existing ? existing.tenantId.value : tenantId;

    if (!existing) {
      const tenant = new SessionTenantId(tenantId);
      const session = Session.create({ id, tenantId: tenant });
      await this.repository.save(session);
      await this.eventBus.publish(session.pullDomainEvents());
    }

    await this.provider.start({
      sessionId,
      tenantId: resolvedTenantId,
      handlers: {
        onQr: async (qr, expiresAt) => {
          await this.updateSessionQr.execute(sessionId, qr, expiresAt);
        },
        onConnected: async (phone, connectedAt) => {
          await this.connectSession.execute(sessionId, phone, connectedAt);
        },
        onDisconnected: async (reason, disconnectedAt) => {
          await this.disconnectSession.execute(sessionId, reason, disconnectedAt);
        },
        onHistorySync: async (payload) => {
          await this.publishSessionHistorySync.execute(sessionId, resolvedTenantId, payload);
        },
        onMessagesUpsert: async (payload) => {
          await this.publishSessionMessagesUpsert.execute(sessionId, resolvedTenantId, payload);
        },
      },
    });
  }
}
