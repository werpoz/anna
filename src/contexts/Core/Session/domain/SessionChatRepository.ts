export type SessionChatRecord = {
  id: string;
  tenantId: string;
  sessionId: string;
  chatJid: string;
  chatName: string | null;
  lastMessageId: string | null;
  lastMessageTs: Date | null;
  lastMessageText: string | null;
  lastMessageType: string | null;
  unreadDelta: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionChatSummary = {
  chatJid: string;
  chatName: string | null;
  lastMessageId: string | null;
  lastMessageTs: Date | null;
  lastMessageText: string | null;
  lastMessageType: string | null;
  unreadCount: number;
};

export interface SessionChatRepository {
  upsertMany(records: SessionChatRecord[]): Promise<void>;
  listByTenant(tenantId: string, sessionId?: string): Promise<SessionChatSummary[]>;
  deleteBySession(sessionId: string): Promise<void>;
}
