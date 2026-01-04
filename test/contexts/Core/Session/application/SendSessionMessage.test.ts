import { describe, expect, it } from 'bun:test';
import { SendSessionMessage } from '@/contexts/Core/Session/application/use-cases/SendSessionMessage';
import { Session } from '@/contexts/Core/Session/domain/Session';
import type { SessionRepository } from '@/contexts/Core/Session/domain/SessionRepository';
import type {
  SessionMessageRepository,
} from '@/contexts/Core/Session/domain/SessionMessageRepository';
import type { SessionProvider } from '@/contexts/Core/Session/application/SessionProvider';

const makeConnectedSession = (): Session => {
  const now = new Date().toISOString();
  return Session.fromPrimitives({
    id: '00000000-0000-0000-0000-000000000001',
    tenantId: '00000000-0000-0000-0000-000000000002',
    status: 'connected',
    phone: null,
    qr: null,
    qrExpiresAt: null,
    connectedAt: now,
    disconnectedAt: null,
    disconnectedReason: null,
    createdAt: now,
    updatedAt: now,
  });
};

const makeRepositories = (rawByMessageId: Record<string, Record<string, unknown> | null>) => {
  const session = makeConnectedSession();

  const sessionRepository: SessionRepository = {
    async save() {},
    async search() {
      return session;
    },
    async searchByTenant() {
      return [session];
    },
    async delete() {},
  };

  const messageRepository: SessionMessageRepository = {
    async upsertMany() {},
    async updateStatuses() {},
    async deleteBySession() {},
    async searchByChat() {
      return [];
    },
    async findRawByMessageId({ messageId }) {
      return rawByMessageId[messageId] ?? null;
    },
  };

  return { sessionRepository, messageRepository };
};

const makeProvider = () => {
  let lastRequest: unknown = null;

  const provider: SessionProvider = {
    async start() {},
    async stop() {},
    async sendMessage(request) {
      lastRequest = request;
    },
  };

  return { provider, getLastRequest: () => lastRequest };
};

describe('SendSessionMessage', () => {
  it('rejects reply and forward together', async () => {
    const { sessionRepository, messageRepository } = makeRepositories({});
    const { provider } = makeProvider();
    const useCase = new SendSessionMessage(sessionRepository, messageRepository, provider);

    await expect(
      useCase.execute({
        sessionId: '00000000-0000-0000-0000-000000000001',
        to: '123@s.whatsapp.net',
        content: 'hola',
        replyToMessageId: 'reply',
        forwardMessageId: 'forward',
      })
    ).rejects.toThrow('mutually exclusive');
  });

  it('sends reply with quotedMessage', async () => {
    const quotedRaw = { key: { id: 'quoted' }, message: { conversation: 'hola' } };
    const { sessionRepository, messageRepository } = makeRepositories({ quoted: quotedRaw });
    const { provider, getLastRequest } = makeProvider();
    const useCase = new SendSessionMessage(sessionRepository, messageRepository, provider);

    await useCase.execute({
      sessionId: '00000000-0000-0000-0000-000000000001',
      to: '123@s.whatsapp.net',
      content: 'respuesta',
      replyToMessageId: 'quoted',
    });

    const request = getLastRequest() as { quotedMessage?: Record<string, unknown> | null };
    expect(request.quotedMessage).toEqual(quotedRaw);
  });

  it('sends forward with forwardMessage', async () => {
    const forwardRaw = { key: { id: 'forward' }, message: { conversation: 'hola' } };
    const { sessionRepository, messageRepository } = makeRepositories({ forward: forwardRaw });
    const { provider, getLastRequest } = makeProvider();
    const useCase = new SendSessionMessage(sessionRepository, messageRepository, provider);

    await useCase.execute({
      sessionId: '00000000-0000-0000-0000-000000000001',
      to: '123@s.whatsapp.net',
      forwardMessageId: 'forward',
    });

    const request = getLastRequest() as { forwardMessage?: Record<string, unknown> | null };
    expect(request.forwardMessage).toEqual(forwardRaw);
  });

  it('fails when reply message is missing', async () => {
    const { sessionRepository, messageRepository } = makeRepositories({});
    const { provider } = makeProvider();
    const useCase = new SendSessionMessage(sessionRepository, messageRepository, provider);

    await expect(
      useCase.execute({
        sessionId: '00000000-0000-0000-0000-000000000001',
        to: '123@s.whatsapp.net',
        content: 'respuesta',
        replyToMessageId: 'missing',
      })
    ).rejects.toThrow('reply message not found');
  });
});
