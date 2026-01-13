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
import { PublishSessionContactsUpsert } from '@/contexts/Core/Session/application/use-cases/PublishSessionContactsUpsert';
import { PublishSessionMessagesUpdate } from '@/contexts/Core/Session/application/use-cases/PublishSessionMessagesUpdate';
import { PublishSessionPresenceUpdate } from '@/contexts/Core/Session/application/use-cases/PublishSessionPresenceUpdate';
import { PublishSessionMessagesEdit } from '@/contexts/Core/Session/application/use-cases/PublishSessionMessagesEdit';
import { PublishSessionMessagesDelete } from '@/contexts/Core/Session/application/use-cases/PublishSessionMessagesDelete';
import { PublishSessionMessagesReaction } from '@/contexts/Core/Session/application/use-cases/PublishSessionMessagesReaction';
import { PublishSessionMessagesMedia } from '@/contexts/Core/Session/application/use-cases/PublishSessionMessagesMedia';

export class StartSession {
  constructor(
    private readonly repository: SessionRepository,
    private readonly eventBus: EventBus,
    private readonly provider: SessionProvider,
    private readonly updateSessionQr: UpdateSessionQr,
    private readonly connectSession: ConnectSession,
    private readonly disconnectSession: DisconnectSession,
    private readonly publishSessionHistorySync: PublishSessionHistorySync,
    private readonly publishSessionMessagesUpsert: PublishSessionMessagesUpsert,
    private readonly publishSessionContactsUpsert: PublishSessionContactsUpsert,
    private readonly publishSessionMessagesUpdate: PublishSessionMessagesUpdate,
    private readonly publishSessionPresenceUpdate: PublishSessionPresenceUpdate,
    private readonly publishSessionMessagesEdit: PublishSessionMessagesEdit,
    private readonly publishSessionMessagesDelete: PublishSessionMessagesDelete,
    private readonly publishSessionMessagesReaction: PublishSessionMessagesReaction,
    private readonly publishSessionMessagesMedia: PublishSessionMessagesMedia
  ) { }

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
        onContactsUpsert: async (payload) => {
          await this.publishSessionContactsUpsert.execute(sessionId, resolvedTenantId, payload);
        },
        onMessagesUpdate: async (payload) => {
          await this.publishSessionMessagesUpdate.execute(sessionId, resolvedTenantId, payload);
        },
        onPresenceUpdate: async (payload) => {
          await this.publishSessionPresenceUpdate.execute(sessionId, resolvedTenantId, payload);
        },
        onMessagesEdit: async (payload) => {
          await this.publishSessionMessagesEdit.execute(sessionId, resolvedTenantId, payload);
        },
        onMessagesDelete: async (payload) => {
          await this.publishSessionMessagesDelete.execute(sessionId, resolvedTenantId, payload);
        },
        onMessagesReaction: async (payload) => {
          await this.publishSessionMessagesReaction.execute(sessionId, resolvedTenantId, payload);
        },
        onMessagesMedia: async (payload) => {
          await this.publishSessionMessagesMedia.execute(sessionId, resolvedTenantId, payload);
        },
      },
    });
  }
}
