export type SessionProviderHandlers = {
  onQr: (qr: string, expiresAt: Date) => Promise<void> | void;
  onConnected: (phone: string, connectedAt: Date) => Promise<void> | void;
  onDisconnected: (reason: string, disconnectedAt: Date) => Promise<void> | void;
  onHistorySync?: (payload: SessionHistorySyncPayload) => Promise<void> | void;
  onMessagesUpsert?: (payload: SessionMessagesUpsertPayload) => Promise<void> | void;
  onContactsUpsert?: (payload: SessionContactsUpsertPayload) => Promise<void> | void;
  onMessagesUpdate?: (payload: SessionMessagesUpdatePayload) => Promise<void> | void;
  onPresenceUpdate?: (payload: SessionPresenceUpdatePayload) => Promise<void> | void;
  onMessagesEdit?: (payload: SessionMessagesEditPayload) => Promise<void> | void;
  onMessagesDelete?: (payload: SessionMessagesDeletePayload) => Promise<void> | void;
  onMessagesReaction?: (payload: SessionMessagesReactionPayload) => Promise<void> | void;
  onMessagesMedia?: (payload: SessionMessagesMediaPayload) => Promise<void> | void;
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

export type SessionMessageKey = {
  id: string;
  remoteJid: string;
  fromMe?: boolean;
  participant?: string;
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

export type SessionPresenceUpdate = {
  jid: string;
  presence: string;
  lastSeen?: number | null;
};

export type SessionPresenceUpdatePayload = {
  chatJid: string;
  updatesCount: number;
  updates: SessionPresenceUpdate[];
};

export type SessionMessageEditUpdate = {
  messageId: string;
  remoteJid?: string;
  participant?: string;
  fromMe?: boolean;
  type?: string | null;
  text?: string | null;
  editedAt?: number | null;
};

export type SessionMessagesEditPayload = {
  editsCount: number;
  edits: SessionMessageEditUpdate[];
};

export type SessionMessageDeleteUpdate = {
  messageId: string;
  remoteJid?: string;
  participant?: string;
  fromMe?: boolean;
  deletedAt?: number | null;
};

export type SessionMessagesDeletePayload = {
  scope: 'message' | 'chat';
  chatJid?: string;
  deletesCount: number;
  deletes: SessionMessageDeleteUpdate[];
};

export type SessionMessageReactionUpdate = {
  messageId: string;
  chatJid?: string;
  actorJid?: string;
  fromMe?: boolean;
  emoji?: string | null;
  reactedAt?: number | null;
  removed?: boolean;
};

export type SessionMessagesReactionPayload = {
  reactionsCount: number;
  reactions: SessionMessageReactionUpdate[];
  source?: 'event' | 'history';
};

export type SessionMessageMediaUpdate = {
  messageId: string;
  chatJid?: string;
  kind: 'image' | 'video' | 'audio' | 'document';
  mime?: string | null;
  size?: number | null;
  fileName?: string | null;
  url?: string | null;
  sha256?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
};

export type SessionMessagesMediaPayload = {
  mediaCount: number;
  media: SessionMessageMediaUpdate[];
  source?: 'event' | 'history';
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

export type ReadSessionMessagesRequest = {
  sessionId: string;
  keys: SessionMessageKey[];
};

export type EditSessionMessageRequest = {
  sessionId: string;
  key: SessionMessageKey;
  content: string;
};

export type DeleteSessionMessageRequest = {
  sessionId: string;
  key: SessionMessageKey;
};

export type ReactSessionMessageRequest = {
  sessionId: string;
  key: SessionMessageKey;
  emoji: string | null;
};

export interface SessionProvider {
  start(request: StartSessionRequest): Promise<void>;
  stop(sessionId: string): Promise<void>;
  sendMessage(request: SendSessionMessageRequest): Promise<void>;
  readMessages(request: ReadSessionMessagesRequest): Promise<void>;
  editMessage(request: EditSessionMessageRequest): Promise<void>;
  deleteMessage(request: DeleteSessionMessageRequest): Promise<void>;
  reactMessage(request: ReactSessionMessageRequest): Promise<void>;
}
