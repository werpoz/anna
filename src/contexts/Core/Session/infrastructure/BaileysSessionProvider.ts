import makeWASocket, {
  Browsers,
  type WASocket,
} from 'baileys';
import type { Pool } from 'pg';
import type {
  SessionProvider,
  SessionProviderHandlers,
  StartSessionRequest,
  SendSessionMessageRequest,
  ReadSessionMessagesRequest,
  EditSessionMessageRequest,
  DeleteSessionMessageRequest,
  ReactSessionMessageRequest,
} from '@/contexts/Core/Session/application/SessionProvider';
import { usePostgresAuthState } from '@/contexts/Core/Session/infrastructure/PostgresBaileysAuthState';
import { logger } from '@/contexts/Shared/infrastructure/observability/logger';
import {
  resolveDisconnectReason,
  shouldReconnect,
  toBaileysKey,
} from './mappers/BaileysUtils';
import {
  buildMediaMessage,
} from './mappers/BaileysMediaMapper';
import { BaileysConnectionHandler } from './handlers/BaileysConnectionHandler';
import { BaileysMessageHandler } from './handlers/BaileysMessageHandler';
import { BaileysChatHandler } from './handlers/BaileysChatHandler';
import { BaileysContactHandler } from './handlers/BaileysContactHandler';

import type { MediaStorage } from '@/contexts/Shared/domain/Storage/MediaStorage';

export type BaileysSessionProviderOptions = {
  pool: Pool;
  qrTtlMs: number;
  mediaStorage?: MediaStorage | null;
  printQrInTerminal: boolean;
  browserName: string;
  markOnlineOnConnect: boolean;
};

type ActiveSession = {
  socket: WASocket;
  handlers: SessionProviderHandlers;
  tenantId: string;
};



export class BaileysSessionProvider implements SessionProvider {
  private readonly sessions: Map<string, ActiveSession>;
  private readonly options: BaileysSessionProviderOptions;
  private readonly reconnectAttempts: Map<string, number>;
  private readonly reconnectTimers: Map<string, ReturnType<typeof setTimeout>>;
  private readonly mediaStorage: MediaStorage | null;

  constructor(options: BaileysSessionProviderOptions) {
    this.options = options;
    this.sessions = new Map();
    this.reconnectAttempts = new Map();
    this.reconnectTimers = new Map();
    this.mediaStorage = options.mediaStorage ?? null;
  }

  async start(request: StartSessionRequest): Promise<void> {
    if (this.sessions.has(request.sessionId)) {
      return;
    }

    const { state, saveCreds } = await usePostgresAuthState(this.options.pool, {
      sessionId: request.sessionId,
      tenantId: request.tenantId,
    });
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: this.options.printQrInTerminal,
      browser: Browsers.ubuntu(this.options.browserName),
      markOnlineOnConnect: this.options.markOnlineOnConnect,
    });

    socket.ev.on('creds.update', saveCreds);
    socket.ev.on('creds.update', saveCreds);

    const connectionHandler = new BaileysConnectionHandler(
      request.sessionId,
      request.handlers,
      this.options.qrTtlMs,
      (sid) => this.clearReconnectState(sid),
      (sid) => this.scheduleReconnect(request),
      (sid) => this.sessions.delete(sid)
    );
    connectionHandler.handle(socket);

    const messageHandler = new BaileysMessageHandler(
      request.sessionId,
      request.tenantId,
      request.handlers,
      this.mediaStorage
    );
    messageHandler.handle(socket);

    const chatHandler = new BaileysChatHandler(
      request.sessionId,
      request.handlers,
      this.mediaStorage
    );
    chatHandler.handle(socket);

    const contactHandler = new BaileysContactHandler(
      request.sessionId,
      request.handlers,
      this.mediaStorage
    );
    contactHandler.handle(socket);

    this.sessions.set(request.sessionId, { socket, handlers: request.handlers, tenantId: request.tenantId });
  }

  async stop(sessionId: string): Promise<void> {
    const active = this.sessions.get(sessionId);
    if (!active) {
      return;
    }

    try {
      active.socket.end(new Error('session_closed'));
    } finally {
      this.sessions.delete(sessionId);
      this.clearReconnectState(sessionId);
    }
  }

  async sendMessage(request: SendSessionMessageRequest): Promise<void> {
    const active = this.sessions.get(request.sessionId);
    if (!active) {
      throw new Error(`Session <${request.sessionId}> is not active`);
    }

    if (request.forwardMessage) {
      await active.socket.sendMessage(request.to, { forward: request.forwardMessage as any });
      return;
    }

    if (request.media) {
      const message = buildMediaMessage({
        media: request.media,
        caption: request.caption ?? undefined,
        ptt: request.ptt ?? false,
      });
      const options = request.quotedMessage ? { quoted: request.quotedMessage as any } : undefined;
      await active.socket.sendMessage(request.to, message as any, options);
      return;
    }

    if (!request.content) {
      throw new Error('content is required for non-forward messages');
    }

    const options = request.quotedMessage ? { quoted: request.quotedMessage as any } : undefined;
    await active.socket.sendMessage(request.to, { text: request.content }, options);
  }

  async readMessages(request: ReadSessionMessagesRequest): Promise<void> {
    const active = this.sessions.get(request.sessionId);
    if (!active) {
      throw new Error(`Session <${request.sessionId}> is not active`);
    }

    const keys = request.keys.map(toBaileysKey);
    await active.socket.readMessages(keys);
  }

  async editMessage(request: EditSessionMessageRequest): Promise<void> {
    const active = this.sessions.get(request.sessionId);
    if (!active) {
      throw new Error(`Session <${request.sessionId}> is not active`);
    }

    const key = toBaileysKey(request.key);
    await active.socket.sendMessage(key.remoteJid ?? request.key.remoteJid, {
      text: request.content,
      edit: key,
    });
  }

  async deleteMessage(request: DeleteSessionMessageRequest): Promise<void> {
    const active = this.sessions.get(request.sessionId);
    if (!active) {
      throw new Error(`Session <${request.sessionId}> is not active`);
    }

    const key = toBaileysKey(request.key);
    await active.socket.sendMessage(key.remoteJid ?? request.key.remoteJid, {
      delete: key,
    });
  }

  async reactMessage(request: ReactSessionMessageRequest): Promise<void> {
    const active = this.sessions.get(request.sessionId);
    if (!active) {
      throw new Error(`Session <${request.sessionId}> is not active`);
    }

    const key = toBaileysKey(request.key);
    await active.socket.sendMessage(key.remoteJid ?? request.key.remoteJid, {
      react: {
        text: request.emoji ?? '',
        key,
      },
    });
  }

  private clearReconnectState(sessionId: string): void {
    const timer = this.reconnectTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(sessionId);
    }
    this.reconnectAttempts.delete(sessionId);
  }

  private scheduleReconnect(request: StartSessionRequest): void {
    const current = this.reconnectAttempts.get(request.sessionId) ?? 0;
    const attempt = current + 1;
    this.reconnectAttempts.set(request.sessionId, attempt);

    const delayMs = Math.min(1000 * attempt, 15000);
    const existing = this.reconnectTimers.get(request.sessionId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.reconnectTimers.delete(request.sessionId);
      void this.start(request);
    }, delayMs);
    this.reconnectTimers.set(request.sessionId, timer);

    logger.warn(
      { sessionId: request.sessionId, attempt, delayMs },
      'Session reconnect scheduled'
    );
  }
}
