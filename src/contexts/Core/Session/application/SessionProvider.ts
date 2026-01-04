export type SessionProviderHandlers = {
  onQr: (qr: string, expiresAt: Date) => Promise<void> | void;
  onConnected: (phone: string, connectedAt: Date) => Promise<void> | void;
  onDisconnected: (reason: string, disconnectedAt: Date) => Promise<void> | void;
  onHistorySync?: (payload: SessionHistorySyncPayload) => Promise<void> | void;
  onMessagesUpsert?: (payload: SessionMessagesUpsertPayload) => Promise<void> | void;
  onContactsUpsert?: (payload: SessionContactsUpsertPayload) => Promise<void> | void;
  onMessagesUpdate?: (payload: SessionMessagesUpdatePayload) => Promise<void> | void;
};

export type SessionMessageSummary = {
  id: string;
  remoteJid?: string;
  participant?: string;
  fromMe?: boolean;
  timestamp?: number;
  type?: string;
  text?: string;
  status?: string;
  statusAt?: number;
  raw?: Record<string, unknown>;
};

export type SessionContactSummary = {
  id: string;
  lid?: string;
  phoneNumber?: string;
  name?: string;
  notify?: string;
  verifiedName?: string;
  imgUrl?: string | null;
  status?: string;
};

export type SessionHistorySyncPayload = {
  syncType?: string | null;
  progress?: number | null;
  isLatest?: boolean;
  chatsCount: number;
  contactsCount: number;
  messagesCount: number;
  messagesTruncated: boolean;
  messages: SessionMessageSummary[];
};

export type SessionMessagesUpsertPayload = {
  upsertType: string;
  requestId?: string;
  messagesCount: number;
  messages: SessionMessageSummary[];
};

export type SessionContactsUpsertPayload = {
  contactsCount: number;
  contactsTruncated: boolean;
  contacts: SessionContactSummary[];
  source?: 'history' | 'event';
};

export type SessionMessageStatusUpdate = {
  messageId: string;
  remoteJid?: string;
  participant?: string;
  fromMe?: boolean;
  status?: string | null;
  statusAt?: number | null;
};

export type SessionMessagesUpdatePayload = {
  updatesCount: number;
  updates: SessionMessageStatusUpdate[];
  source?: 'update' | 'receipt';
};

export type StartSessionRequest = {
  sessionId: string;
  tenantId: string;
  handlers: SessionProviderHandlers;
};

export type SendSessionMessageRequest = {
  sessionId: string;
  to: string;
  content?: string;
  messageId?: string;
  replyToMessageId?: string;
  forwardMessageId?: string;
  quotedMessage?: Record<string, unknown> | null;
  forwardMessage?: Record<string, unknown> | null;
};

export interface SessionProvider {
  start(request: StartSessionRequest): Promise<void>;
  stop(sessionId: string): Promise<void>;
  sendMessage(request: SendSessionMessageRequest): Promise<void>;
}
