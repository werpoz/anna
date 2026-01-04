export type SessionMessageRecord = {
  id: string;
  tenantId: string;
  sessionId: string;
  chatJid: string;
  messageId: string;
  fromMe: boolean;
  senderJid: string | null;
  timestamp: Date | null;
  type: string | null;
  text: string | null;
  raw: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface SessionMessageRepository {
  upsertMany(records: SessionMessageRecord[]): Promise<void>;
  deleteBySession(sessionId: string): Promise<void>;
  searchByChat(params: {
    sessionId: string;
    chatJid: string;
    limit: number;
    cursor?: { timestamp: Date; messageId: string };
  }): Promise<SessionMessageRecord[]>;
}
