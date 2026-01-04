export type SessionMessageReactionRecord = {
  id: string;
  tenantId: string;
  sessionId: string;
  chatJid: string;
  messageId: string;
  actorJid: string;
  fromMe: boolean;
  emoji: string | null;
  reactedAt: Date | null;
  isRemoved: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionMessageReactionSummary = {
  messageId: string;
  emoji: string;
  count: number;
  actors: string[];
};

export interface SessionMessageReactionRepository {
  upsertMany(records: SessionMessageReactionRecord[]): Promise<void>;
  listByMessageIds(params: {
    sessionId: string;
    messageIds: string[];
  }): Promise<SessionMessageReactionSummary[]>;
  listByMessage(params: { sessionId: string; messageId: string }): Promise<SessionMessageReactionRecord[]>;
  deleteBySession(sessionId: string): Promise<void>;
}
