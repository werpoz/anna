export type SessionProviderHandlers = {
  onQr: (qr: string, expiresAt: Date) => Promise<void> | void;
  onConnected: (phone: string, connectedAt: Date) => Promise<void> | void;
  onDisconnected: (reason: string, disconnectedAt: Date) => Promise<void> | void;
  onHistorySync?: (payload: SessionHistorySyncPayload) => Promise<void> | void;
  onMessagesUpsert?: (payload: SessionMessagesUpsertPayload) => Promise<void> | void;
};

export type SessionMessageSummary = {
  id: string;
  remoteJid?: string;
  participant?: string;
  fromMe?: boolean;
  timestamp?: number;
  type?: string;
  text?: string;
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

export type StartSessionRequest = {
  sessionId: string;
  tenantId: string;
  handlers: SessionProviderHandlers;
};

export type SendSessionMessageRequest = {
  sessionId: string;
  to: string;
  content: string;
  messageId?: string;
};

export interface SessionProvider {
  start(request: StartSessionRequest): Promise<void>;
  stop(sessionId: string): Promise<void>;
  sendMessage(request: SendSessionMessageRequest): Promise<void>;
}
