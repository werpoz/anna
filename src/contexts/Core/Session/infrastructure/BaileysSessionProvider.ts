import makeWASocket, {
  Browsers,
  BufferJSON,
  DisconnectReason,
  downloadMediaMessage,
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
  SessionMessagesReactionPayload,
  SessionMessageReactionUpdate,
  SessionMessagesMediaPayload,
  SessionMessageMediaUpdate,
  StartSessionRequest,
  SendSessionMessageRequest,
  ReadSessionMessagesRequest,
  EditSessionMessageRequest,
  DeleteSessionMessageRequest,
  ReactSessionMessageRequest,
} from '@/contexts/Core/Session/application/SessionProvider';
import { usePostgresAuthState } from '@/contexts/Core/Session/infrastructure/PostgresBaileysAuthState';
import { logger } from '@/contexts/Shared/infrastructure/observability/logger';
import { S3Storage } from '@/contexts/Shared/infrastructure/Storage/S3Storage';
import { env } from '@/contexts/Shared/infrastructure/config/env';

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
  tenantId: string;
};

const MAX_HISTORY_MESSAGES = 200;
const MAX_UPSERT_MESSAGES = 50;
const MAX_CONTACTS = 200;
const MAX_REACTIONS = 200;
const MAX_MEDIA_DOWNLOADS = 10;
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

export class BaileysSessionProvider implements SessionProvider {
  private readonly sessions: Map<string, ActiveSession>;
  private readonly options: BaileysSessionProviderOptions;
  private readonly reconnectAttempts: Map<string, number>;
  private readonly reconnectTimers: Map<string, ReturnType<typeof setTimeout>>;
  private readonly mediaStorage: S3Storage | null;

  constructor(options: BaileysSessionProviderOptions) {
    this.options = options;
    this.sessions = new Map();
    this.reconnectAttempts = new Map();
    this.reconnectTimers = new Map();
    this.mediaStorage =
      env.s3Endpoint && env.s3Bucket && env.s3AccessKey && env.s3SecretKey ? new S3Storage() : null;
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
      const reactions = request.handlers.onMessagesReaction
        ? messages
            .map((message) => buildReactionUpdateFromMessage(message, socket.user?.id ?? null))
            .filter(isReactionUpdate)
            .slice(0, MAX_REACTIONS)
        : [];
      const nonReactionMessages = messages.filter((message) => !isReactionMessage(message));
      const summaries = nonReactionMessages.slice(0, MAX_HISTORY_MESSAGES).map(buildMessageSummary);
      const syncPayload: SessionHistorySyncPayload = {
        syncType: resolveHistorySyncType(payload.syncType),
        progress: payload.progress ?? null,
        isLatest: payload.isLatest,
        chatsCount: payload.chats?.length ?? 0,
        contactsCount: payload.contacts?.length ?? 0,
        messagesCount: nonReactionMessages.length,
        messagesTruncated: nonReactionMessages.length > summaries.length,
        messages: summaries,
      };

      void request.handlers.onHistorySync(syncPayload);

      if (request.handlers.onMessagesMedia) {
        const mediaMessages = messages.filter(isMediaMessage).slice(0, MAX_MEDIA_DOWNLOADS);
        if (mediaMessages.length) {
          void this.processMediaMessages({
            sessionId: request.sessionId,
            tenantId: request.tenantId,
            socket,
            messages: mediaMessages,
            source: 'history',
            onMessagesMedia: request.handlers.onMessagesMedia,
          });
        }
      }

      if (reactions.length && request.handlers.onMessagesReaction) {
        const reactionsPayload: SessionMessagesReactionPayload = {
          reactionsCount: reactions.length,
          reactions,
          source: 'history',
        };
        void request.handlers.onMessagesReaction(reactionsPayload);
      }

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
      const nonReactionMessages = messages.filter((message) => !isReactionMessage(message));
      const summaries = nonReactionMessages.slice(0, MAX_UPSERT_MESSAGES).map(buildMessageSummary);
      const upsertPayload: SessionMessagesUpsertPayload = {
        upsertType: payload.type,
        requestId: payload.requestId,
        messagesCount: nonReactionMessages.length,
        messages: summaries,
      };

      void request.handlers.onMessagesUpsert(upsertPayload);

      if (request.handlers.onMessagesMedia) {
        const mediaMessages = messages.filter(isMediaMessage).slice(0, MAX_MEDIA_DOWNLOADS);
        if (mediaMessages.length) {
          void this.processMediaMessages({
            sessionId: request.sessionId,
            tenantId: request.tenantId,
            socket,
            messages: mediaMessages,
            source: 'event',
            onMessagesMedia: request.handlers.onMessagesMedia,
          });
        }
      }
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

    socket.ev.on('messages.reaction', (updates) => {
      if (!request.handlers.onMessagesReaction) {
        return;
      }
      const reactions = updates
        .map((update) => buildReactionUpdateFromEvent(update, socket.user?.id ?? null))
        .filter(isReactionUpdate)
        .slice(0, MAX_REACTIONS);
      if (!reactions.length) {
        return;
      }
      const reactionsPayload: SessionMessagesReactionPayload = {
        reactionsCount: reactions.length,
        reactions,
        source: 'event',
      };
      void request.handlers.onMessagesReaction(reactionsPayload);
    });

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

  private async processMediaMessages(params: {
    sessionId: string;
    tenantId: string;
    socket: WASocket;
    messages: proto.IWebMessageInfo[];
    source: 'event' | 'history';
    onMessagesMedia: (payload: SessionMessagesMediaPayload) => Promise<void> | void;
  }): Promise<void> {
    if (!this.mediaStorage) {
      logger.warn('Media storage not configured; skipping media upload');
      return;
    }

    const mediaUpdates: SessionMessageMediaUpdate[] = [];
    for (const message of params.messages) {
      const update = await this.uploadMediaMessage({
        sessionId: params.sessionId,
        tenantId: params.tenantId,
        socket: params.socket,
        message,
      });
      if (update) {
        mediaUpdates.push(update);
      }
    }

    if (!mediaUpdates.length) {
      return;
    }

    await params.onMessagesMedia({
      mediaCount: mediaUpdates.length,
      media: mediaUpdates,
      source: params.source,
    });
  }

  private async uploadMediaMessage(params: {
    sessionId: string;
    tenantId: string;
    socket: WASocket;
    message: proto.IWebMessageInfo;
  }): Promise<SessionMessageMediaUpdate | null> {
    if (!this.mediaStorage) {
      return null;
    }
    const meta = resolveMediaMeta(params.message);
    if (!meta) {
      return null;
    }

    if (meta.size && meta.size > MAX_MEDIA_BYTES) {
      logger.warn(
        { messageId: meta.messageId, size: meta.size },
        'Skipping media download: file too large'
      );
      return null;
    }

    try {
      const buffer = await downloadMediaMessage(
        params.message as any,
        'buffer',
        {},
        {
          logger,
          reuploadRequest: params.socket.updateMediaMessage,
        }
      );

      const fileName = meta.fileName ?? `${meta.messageId}.${resolveExtension(meta.mime)}`;
      const key = buildMediaKey({
        tenantId: params.tenantId,
        sessionId: params.sessionId,
        messageId: meta.messageId,
        fileName,
      });

      const result = await this.mediaStorage.uploadBuffer({
        key,
        body: buffer,
        contentType: meta.mime,
      });

      return {
        messageId: meta.messageId,
        chatJid: meta.chatJid,
        kind: meta.kind,
        mime: meta.mime,
        size: meta.size,
        fileName,
        url: result.url,
        sha256: meta.sha256,
        width: meta.width,
        height: meta.height,
        duration: meta.duration,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn({ err: message, messageId: meta.messageId }, 'Media download/upload failed');
      return null;
    }
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

const normalizeTimestampSeconds = (
  value: number | bigint | { toNumber?: () => number } | null | undefined
): number | null => {
  const resolved = resolveTimestampSeconds(value);
  if (resolved === null) {
    return null;
  }
  return resolved > 1_000_000_000_000 ? Math.floor(resolved / 1000) : resolved;
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

const isReactionMessage = (message: proto.IWebMessageInfo): boolean => {
  const content = extractMessageContent(message.message);
  return Boolean(content && (content as { reactionMessage?: unknown }).reactionMessage);
};

const buildReactionUpdateFromMessage = (
  message: proto.IWebMessageInfo,
  selfJid: string | null
): SessionMessageReactionUpdate | null => {
  const content = extractMessageContent(message.message);
  const reaction = (content as { reactionMessage?: proto.Message.IReactionMessage } | null)?.reactionMessage;
  if (!reaction?.key) {
    return null;
  }
  const targetKey = reaction.key;
  const messageId = targetKey.id ?? '';
  const chatJid = targetKey.remoteJid ?? message.key?.remoteJid ?? '';
  if (!messageId || !chatJid) {
    return null;
  }
  const actorKey = message.key ?? {};
  const fromMe = actorKey.fromMe ?? false;
  const actorJid =
    actorKey.participant ??
    (fromMe ? selfJid ?? null : actorKey.remoteJid ?? null) ??
    null;
  if (!actorJid) {
    return null;
  }
  const emoji = reaction.text ?? null;
  const reactedAt = normalizeTimestampSeconds(reaction.senderTimestampMs);
  return {
    messageId,
    chatJid,
    actorJid,
    fromMe,
    emoji,
    reactedAt,
    removed: !emoji,
  };
};

const buildReactionUpdateFromEvent = (
  update: { key: proto.IMessageKey; reaction: proto.IReaction },
  selfJid: string | null
): SessionMessageReactionUpdate | null => {
  const targetKey = update.key ?? null;
  const messageId = targetKey?.id ?? '';
  const chatJid = targetKey?.remoteJid ?? '';
  if (!messageId || !chatJid) {
    return null;
  }
  const reaction = update.reaction ?? null;
  const actorKey = reaction?.key ?? null;
  const fromMe = actorKey?.fromMe ?? false;
  const actorJid =
    actorKey?.participant ??
    (fromMe ? selfJid ?? null : actorKey?.remoteJid ?? null) ??
    null;
  if (!actorJid) {
    return null;
  }
  const emoji = reaction?.text ?? null;
  const reactedAt = normalizeTimestampSeconds(reaction?.senderTimestampMs ?? null);
  return {
    messageId,
    chatJid,
    actorJid,
    fromMe,
    emoji,
    reactedAt,
    removed: !emoji,
  };
};

const isReactionUpdate = (
  value: SessionMessageReactionUpdate | null
): value is SessionMessageReactionUpdate => Boolean(value);

type ResolvedMediaMeta = {
  messageId: string;
  chatJid: string;
  kind: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  mime: string | null;
  size: number | null;
  fileName: string | null;
  sha256: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
};

const resolveNumberValue = (
  value: number | bigint | { toNumber?: () => number } | null | undefined
): number | null => {
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

const toBase64 = (value: Uint8Array | Buffer | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  return Buffer.from(value).toString('base64');
};

const resolveMediaMeta = (message: proto.IWebMessageInfo): ResolvedMediaMeta | null => {
  const key = message.key ?? {};
  const messageId = key.id ?? '';
  const chatJid = key.remoteJid ?? '';
  if (!messageId || !chatJid) {
    return null;
  }

  const content = extractMessageContent(message.message);
  const contentType = getContentType(content);
  if (!contentType) {
    return null;
  }

  if (contentType === 'imageMessage') {
    const image = content?.imageMessage;
    if (!image) {
      return null;
    }
    return {
      messageId,
      chatJid,
      kind: 'image',
      mime: image.mimetype ?? null,
      size: resolveNumberValue(image.fileLength),
      fileName: null,
      sha256: toBase64(image.fileSha256),
      width: image.width ?? null,
      height: image.height ?? null,
      duration: null,
    };
  }

  if (contentType === 'videoMessage') {
    const video = content?.videoMessage;
    if (!video) {
      return null;
    }
    return {
      messageId,
      chatJid,
      kind: 'video',
      mime: video.mimetype ?? null,
      size: resolveNumberValue(video.fileLength),
      fileName: null,
      sha256: toBase64(video.fileSha256),
      width: video.width ?? null,
      height: video.height ?? null,
      duration: resolveNumberValue(video.seconds) ?? null,
    };
  }

  if (contentType === 'audioMessage') {
    const audio = content?.audioMessage;
    if (!audio) {
      return null;
    }
    return {
      messageId,
      chatJid,
      kind: 'audio',
      mime: audio.mimetype ?? null,
      size: resolveNumberValue(audio.fileLength),
      fileName: null,
      sha256: toBase64(audio.fileSha256),
      width: null,
      height: null,
      duration: resolveNumberValue(audio.seconds) ?? null,
    };
  }

  if (contentType === 'documentMessage') {
    const doc = content?.documentMessage;
    if (!doc) {
      return null;
    }
    return {
      messageId,
      chatJid,
      kind: 'document',
      mime: doc.mimetype ?? null,
      size: resolveNumberValue(doc.fileLength),
      fileName: doc.fileName ?? null,
      sha256: toBase64(doc.fileSha256),
      width: null,
      height: null,
      duration: null,
    };
  }

  if (contentType === 'stickerMessage') {
    const sticker = content?.stickerMessage;
    if (!sticker) {
      return null;
    }
    return {
      messageId,
      chatJid,
      kind: 'sticker',
      mime: sticker.mimetype ?? null,
      size: resolveNumberValue(sticker.fileLength),
      fileName: null,
      sha256: toBase64(sticker.fileSha256),
      width: (sticker as { width?: number }).width ?? null,
      height: (sticker as { height?: number }).height ?? null,
      duration: null,
    };
  }

  return null;
};

const isMediaMessage = (message: proto.IWebMessageInfo): boolean => Boolean(resolveMediaMeta(message));

const resolveExtension = (mime: string | null | undefined): string => {
  if (!mime) {
    return 'bin';
  }
  const normalized = mime.split(';')[0]?.trim() ?? mime;
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'application/pdf': 'pdf',
  };
  return map[normalized] ?? normalized.split('/')[1] ?? 'bin';
};

const sanitizeFileName = (value: string): string => value.replace(/[\\/]/g, '_');

const buildMediaKey = (params: {
  tenantId: string;
  sessionId: string;
  messageId: string;
  fileName: string;
}): string =>
  `tenants/${params.tenantId}/sessions/${params.sessionId}/messages/${params.messageId}/${sanitizeFileName(params.fileName)}`;

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

const buildMediaMessage = (params: {
  media: {
    kind: 'image' | 'video' | 'audio' | 'document' | 'sticker';
    url: string;
    mime?: string | null;
    fileName?: string | null;
  };
  caption?: string;
  ptt: boolean;
}): Record<string, unknown> => {
  const { media, caption, ptt } = params;
  const mime = media.mime ?? undefined;

  if (media.kind === 'image') {
    return {
      image: { url: media.url },
      caption,
      mimetype: mime,
    };
  }

  if (media.kind === 'video') {
    return {
      video: { url: media.url },
      caption,
      mimetype: mime,
    };
  }

  if (media.kind === 'audio') {
    return {
      audio: { url: media.url },
      mimetype: mime,
      ptt,
    };
  }

  if (media.kind === 'sticker') {
    return {
      sticker: { url: media.url },
      mimetype: mime,
    };
  }

  return {
    document: { url: media.url },
    fileName: media.fileName ?? undefined,
    caption,
    mimetype: mime,
  };
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
