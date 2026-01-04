import makeWASocket, {
  Browsers,
  BufferJSON,
  DisconnectReason,
  extractMessageContent,
  getContentType,
  proto,
  type Contact,
  type WASocket,
} from 'baileys';
import type { Pool } from 'pg';
import type {
  SessionProvider,
  SessionProviderHandlers,
  SessionHistorySyncPayload,
  SessionContactsUpsertPayload,
  SessionContactSummary,
  SessionMessageSummary,
  SessionMessageStatusUpdate,
  SessionMessagesUpsertPayload,
  SessionMessagesUpdatePayload,
  SessionPresenceUpdatePayload,
  SessionPresenceUpdate,
  SessionMessagesEditPayload,
  SessionMessageEditUpdate,
  SessionMessagesDeletePayload,
  SessionMessageDeleteUpdate,
  StartSessionRequest,
  SendSessionMessageRequest,
  ReadSessionMessagesRequest,
  EditSessionMessageRequest,
  DeleteSessionMessageRequest,
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
const MAX_CONTACTS = 200;

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

      if (request.handlers.onContactsUpsert && payload.contacts?.length) {
        const contacts = payload.contacts
          .slice(0, MAX_CONTACTS)
          .map(buildContactSummary)
          .filter(isContactSummary);
        const contactsPayload: SessionContactsUpsertPayload = {
          contactsCount: payload.contacts.length,
          contactsTruncated: payload.contacts.length > contacts.length,
          contacts,
          source: 'history',
        };
        void request.handlers.onContactsUpsert(contactsPayload);
      }
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

    socket.ev.on('contacts.upsert', (contacts) => {
      if (!request.handlers.onContactsUpsert) {
        return;
      }
      const summaries = contacts
        .slice(0, MAX_CONTACTS)
        .map(buildContactSummary)
        .filter(isContactSummary);
      const contactsPayload: SessionContactsUpsertPayload = {
        contactsCount: contacts.length,
        contactsTruncated: contacts.length > summaries.length,
        contacts: summaries,
        source: 'event',
      };
      void request.handlers.onContactsUpsert(contactsPayload);
    });

    socket.ev.on('contacts.update', (contacts) => {
      if (!request.handlers.onContactsUpsert) {
        return;
      }
      const summaries = contacts
        .slice(0, MAX_CONTACTS)
        .map(buildContactSummary)
        .filter(isContactSummary);
      const contactsPayload: SessionContactsUpsertPayload = {
        contactsCount: contacts.length,
        contactsTruncated: contacts.length > summaries.length,
        contacts: summaries,
        source: 'event',
      };
      void request.handlers.onContactsUpsert(contactsPayload);
    });

    socket.ev.on('messages.update', (updates) => {
      if (!request.handlers.onMessagesUpdate) {
        return;
      }
      const statusUpdates = updates
        .map((update) => buildMessageStatusUpdate(update.key, update.update))
        .filter(isStatusUpdate);
      if (statusUpdates.length) {
        const payload: SessionMessagesUpdatePayload = {
          updatesCount: updates.length,
          updates: statusUpdates,
          source: 'update',
        };
        void request.handlers.onMessagesUpdate(payload);
      }

      if (request.handlers.onMessagesEdit) {
        const edits = updates
          .map((update) => buildMessageEditUpdate(update.key, update.update))
          .filter(isEditUpdate);
        if (edits.length) {
          const payload: SessionMessagesEditPayload = {
            editsCount: edits.length,
            edits,
          };
          void request.handlers.onMessagesEdit(payload);
        }
      }
    });

    socket.ev.on('message-receipt.update', (updates) => {
      if (!request.handlers.onMessagesUpdate) {
        return;
      }
      const summaries = updates
        .map((update) => buildReceiptStatusUpdate(update.key, update.receipt))
        .filter(isStatusUpdate);
      if (!summaries.length) {
        return;
      }
      const payload: SessionMessagesUpdatePayload = {
        updatesCount: updates.length,
        updates: summaries,
        source: 'receipt',
      };
      void request.handlers.onMessagesUpdate(payload);
    });

    socket.ev.on('messages.delete', (payload) => {
      if (!request.handlers.onMessagesDelete) {
        return;
      }

      if ('keys' in payload) {
        const deletes = payload.keys
          .map((key) => buildMessageDeleteUpdate(key))
          .filter(isDeleteUpdate);
        if (!deletes.length) {
          return;
        }
        const deletePayload: SessionMessagesDeletePayload = {
          scope: 'message',
          deletesCount: deletes.length,
          deletes,
        };
        void request.handlers.onMessagesDelete(deletePayload);
        return;
      }

      if (payload.all && payload.jid) {
        const deletePayload: SessionMessagesDeletePayload = {
          scope: 'chat',
          chatJid: payload.jid,
          deletesCount: 0,
          deletes: [],
        };
        void request.handlers.onMessagesDelete(deletePayload);
      }
    });

    socket.ev.on('presence.update', (update) => {
      if (!request.handlers.onPresenceUpdate) {
        return;
      }

      const updates = buildPresenceUpdates(update.presences);
      if (!updates.length) {
        return;
      }

      const payload: SessionPresenceUpdatePayload = {
        chatJid: update.id,
        updatesCount: updates.length,
        updates,
      };

      void request.handlers.onPresenceUpdate(payload);
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

    if (request.forwardMessage) {
      await active.socket.sendMessage(request.to, { forward: request.forwardMessage as any });
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
    status: resolveMessageStatus(message.status),
    raw,
  };
};

const buildContactSummary = (contact: Partial<Contact>): SessionContactSummary | null => {
  const id = contact.id ?? '';
  if (!id) {
    return null;
  }

  return {
    id,
    lid: contact.lid,
    phoneNumber: contact.phoneNumber,
    name: contact.name,
    notify: contact.notify,
    verifiedName: contact.verifiedName,
    imgUrl: contact.imgUrl,
    status: contact.status,
  };
};

const buildMessageStatusUpdate = (
  key: proto.IMessageKey | null | undefined,
  update: Partial<proto.IWebMessageInfo> | null | undefined
): SessionMessageStatusUpdate | null => {
  const messageId = key?.id ?? '';
  if (!messageId) {
    return null;
  }

  const status = resolveMessageStatus(update?.status);
  const statusAt = null;
  if (!status) {
    return null;
  }

  return {
    messageId,
    remoteJid: key?.remoteJid ?? undefined,
    participant: key?.participant ?? undefined,
    fromMe: key?.fromMe ?? undefined,
    status,
    statusAt,
  };
};

const buildReceiptStatusUpdate = (
  key: proto.IMessageKey | null | undefined,
  receipt: proto.IUserReceipt | null | undefined
): SessionMessageStatusUpdate | null => {
  const messageId = key?.id ?? '';
  if (!messageId) {
    return null;
  }

  const playedAt = resolveTimestampSeconds(receipt?.playedTimestamp);
  const readAt = resolveTimestampSeconds(receipt?.readTimestamp);
  const deliveredAt = resolveTimestampSeconds(receipt?.receiptTimestamp);
  const status =
    playedAt !== null ? 'played' : readAt !== null ? 'read' : deliveredAt !== null ? 'delivered' : null;
  const statusAt = playedAt ?? readAt ?? deliveredAt;
  if (!status && statusAt === null) {
    return null;
  }

  return {
    messageId,
    remoteJid: key?.remoteJid ?? undefined,
    participant: key?.participant ?? undefined,
    fromMe: key?.fromMe ?? undefined,
    status,
    statusAt,
  };
};

const resolveMessageStatus = (status: proto.WebMessageInfo.Status | null | undefined): string | undefined => {
  if (status === null || status === undefined) {
    return undefined;
  }
  if (typeof status === 'number') {
    return proto.WebMessageInfo.Status[status] ?? String(status);
  }
  return String(status);
};

const resolveTimestampSeconds = (value: number | bigint | { toNumber?: () => number } | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'object' && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return null;
};

const isContactSummary = (value: SessionContactSummary | null): value is SessionContactSummary => Boolean(value);

const isStatusUpdate = (
  value: SessionMessageStatusUpdate | null
): value is SessionMessageStatusUpdate => Boolean(value);

const buildPresenceUpdates = (
  presences: Record<string, { lastKnownPresence?: string; lastSeen?: number }> | undefined
): SessionPresenceUpdate[] => {
  if (!presences) {
    return [];
  }

  return Object.entries(presences)
    .map(([jid, data]) => ({
      jid,
      presence: data.lastKnownPresence ?? 'unavailable',
      lastSeen: data.lastSeen ?? null,
    }))
    .filter((item) => Boolean(item.jid));
};

const buildMessageEditUpdate = (
  key: proto.IMessageKey | null | undefined,
  update: Partial<proto.IWebMessageInfo> | null | undefined
): SessionMessageEditUpdate | null => {
  const messageId = key?.id ?? '';
  if (!messageId) {
    return null;
  }

  const message = update?.message;
  if (!message) {
    return null;
  }

  const content = extractMessageContent(message);
  const type = content ? getContentType(content) : null;
  const text =
    content?.conversation ??
    content?.extendedTextMessage?.text ??
    content?.imageMessage?.caption ??
    content?.videoMessage?.caption ??
    content?.documentMessage?.caption ??
    undefined;

  if (typeof text !== 'string' && !type) {
    return null;
  }

  return {
    messageId,
    remoteJid: key?.remoteJid ?? undefined,
    participant: key?.participant ?? undefined,
    fromMe: key?.fromMe ?? undefined,
    type: type ?? null,
    text: text ?? null,
    editedAt: resolveTimestampSeconds(update?.messageTimestamp) ?? Math.floor(Date.now() / 1000),
  };
};

const buildMessageDeleteUpdate = (
  key: proto.IMessageKey | null | undefined
): SessionMessageDeleteUpdate | null => {
  const messageId = key?.id ?? '';
  const remoteJid = key?.remoteJid ?? '';
  if (!messageId || !remoteJid) {
    return null;
  }

  return {
    messageId,
    remoteJid,
    participant: key?.participant ?? undefined,
    fromMe: key?.fromMe ?? undefined,
    deletedAt: Math.floor(Date.now() / 1000),
  };
};

const toBaileysKey = (key: {
  id: string;
  remoteJid: string;
  fromMe?: boolean;
  participant?: string;
}): proto.IMessageKey => ({
  id: key.id,
  remoteJid: key.remoteJid,
  fromMe: key.fromMe,
  participant: key.participant,
});

const isEditUpdate = (value: SessionMessageEditUpdate | null): value is SessionMessageEditUpdate =>
  Boolean(value);

const isDeleteUpdate = (value: SessionMessageDeleteUpdate | null): value is SessionMessageDeleteUpdate =>
  Boolean(value);

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
