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
  status: string | null;
  statusAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionMessageStatusRecord = {
  sessionId: string;
  messageId: string;
  status: string | null;
  statusAt: Date | null;
  updatedAt: Date;
};

export interface SessionMessageRepository {
  upsertMany(records: SessionMessageRecord[]): Promise<void>;
  updateStatuses(records: SessionMessageStatusRecord[]): Promise<void>;
  deleteBySession(sessionId: string): Promise<void>;
  searchByChat(params: {
    sessionId: string;
    chatJid: string;
    limit: number;
    cursor?: { timestamp: Date; messageId: string };
  }): Promise<SessionMessageRecord[]>;
}
