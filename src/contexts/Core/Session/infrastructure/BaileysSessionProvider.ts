import makeWASocket, {
  Browsers,
  BufferJSON,
  DisconnectReason,
  extractMessageContent,
  getContentType,
  proto,
  type WASocket,
} from 'baileys';
import type { Pool } from 'pg';
import type {
  SessionProvider,
  SessionProviderHandlers,
  SessionHistorySyncPayload,
  SessionMessageSummary,
  SessionMessagesUpsertPayload,
  StartSessionRequest,
  SendSessionMessageRequest,
} from '@/contexts/Core/Session/application/SessionProvider';
import { usePostgresAuthState } from '@/contexts/Core/Session/infrastructure/PostgresBaileysAuthState';
import { logger } from '@/contexts/Shared/infrastructure/observability/logger';

export type BaileysSessionProviderOptions = {
  pool: Pool;
  qrTtlMs: number;
  printQrInTerminal: boolean;
  browserName: string;
  markOnlineOnConnect: boolean;
};

type ActiveSession = {
  socket: WASocket;
  handlers: SessionProviderHandlers;
};

const MAX_HISTORY_MESSAGES = 200;
const MAX_UPSERT_MESSAGES = 50;

export class BaileysSessionProvider implements SessionProvider {
  private readonly sessions: Map<string, ActiveSession>;
  private readonly options: BaileysSessionProviderOptions;
  private readonly reconnectAttempts: Map<string, number>;
  private readonly reconnectTimers: Map<string, ReturnType<typeof setTimeout>>;

  constructor(options: BaileysSessionProviderOptions) {
    this.options = options;
    this.sessions = new Map();
    this.reconnectAttempts = new Map();
    this.reconnectTimers = new Map();
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
    socket.ev.on('connection.update', (update) => {
      const { connection, qr, lastDisconnect } = update;

      if (qr) {
        const expiresAt = new Date(Date.now() + this.options.qrTtlMs);
        void request.handlers.onQr(qr, expiresAt);
      }

      if (connection === 'open') {
        this.clearReconnectState(request.sessionId);
        const phone = socket.user?.id ?? '';
        if (phone) {
          void request.handlers.onConnected(phone, new Date());
        }
      }

      if (connection === 'close') {
        const reason = resolveDisconnectReason(lastDisconnect?.error);
        void request.handlers.onDisconnected(reason, new Date());
        this.sessions.delete(request.sessionId);
        if (shouldReconnect(lastDisconnect?.error)) {
          this.scheduleReconnect(request);
        }
      }
    });

    socket.ev.on('messaging-history.set', (payload) => {
      if (!request.handlers.onHistorySync) {
        return;
      }

      const messages = payload.messages ?? [];
      const summaries = messages.slice(0, MAX_HISTORY_MESSAGES).map(buildMessageSummary);
      const syncPayload: SessionHistorySyncPayload = {
        syncType: resolveHistorySyncType(payload.syncType),
        progress: payload.progress ?? null,
        isLatest: payload.isLatest,
        chatsCount: payload.chats?.length ?? 0,
        contactsCount: payload.contacts?.length ?? 0,
        messagesCount: messages.length,
        messagesTruncated: messages.length > summaries.length,
        messages: summaries,
      };

      void request.handlers.onHistorySync(syncPayload);
    });

    socket.ev.on('messages.upsert', (payload) => {
      if (!request.handlers.onMessagesUpsert) {
        return;
      }

      const messages = payload.messages ?? [];
      const summaries = messages.slice(0, MAX_UPSERT_MESSAGES).map(buildMessageSummary);
      const upsertPayload: SessionMessagesUpsertPayload = {
        upsertType: payload.type,
        requestId: payload.requestId,
        messagesCount: messages.length,
        messages: summaries,
      };

      void request.handlers.onMessagesUpsert(upsertPayload);
    });

    this.sessions.set(request.sessionId, { socket, handlers: request.handlers });
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

    await active.socket.sendMessage(request.to, { text: request.content });
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

const resolveHistorySyncType = (
  syncType: proto.HistorySync.HistorySyncType | null | undefined
): string | null => {
  if (syncType === null || syncType === undefined) {
    return null;
  }

  if (typeof syncType === 'number') {
    return proto.HistorySync.HistorySyncType[syncType] ?? String(syncType);
  }

  return String(syncType);
};

const buildMessageSummary = (message: proto.IWebMessageInfo): SessionMessageSummary => {
  const key = message.key ?? {};
  const content = extractMessageContent(message.message);
  const contentType = getContentType(content);
  const text =
    content?.conversation ??
    content?.extendedTextMessage?.text ??
    content?.imageMessage?.caption ??
    content?.videoMessage?.caption ??
    content?.documentMessage?.caption ??
    undefined;
  const raw = JSON.parse(JSON.stringify(message, BufferJSON.replacer)) as Record<string, unknown>;

  return {
    id: key.id ?? '',
    remoteJid: key.remoteJid ?? undefined,
    participant: key.participant ?? undefined,
    fromMe: key.fromMe ?? false,
    timestamp: message.messageTimestamp ? Number(message.messageTimestamp) : undefined,
    type: contentType ?? undefined,
    text,
    raw,
  };
};

const resolveDisconnectReason = (error: unknown): string => {
  const statusCode = (error as { output?: { statusCode?: number } })?.output?.statusCode;

  if (typeof statusCode === 'number') {
    const reason = DisconnectReason[statusCode as DisconnectReason];
    if (typeof reason === 'string') {
      return reason;
    }
    return `status_${statusCode}`;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'unknown';
};

const shouldReconnect = (error: unknown): boolean => {
  const statusCode = (error as { output?: { statusCode?: number } })?.output?.statusCode;
  if (statusCode === DisconnectReason.loggedOut) {
    return false;
  }

  if (error instanceof Error && error.message === 'session_closed') {
    return false;
  }

  return true;
};
