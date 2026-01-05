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
  isEdited: boolean;
  editedAt: Date | null;
  isDeleted: boolean;
  deletedAt: Date | null;
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

export type SessionMessageEditRecord = {
  sessionId: string;
  messageId: string;
  type: string | null;
  text: string | null;
  editedAt: Date | null;
  updatedAt: Date;
};

export type SessionMessageDeleteRecord = {
  sessionId: string;
  messageId: string;
  deletedAt: Date | null;
  updatedAt: Date;
};

export interface SessionMessageRepository {
  upsertMany(records: SessionMessageRecord[]): Promise<void>;
  updateStatuses(records: SessionMessageStatusRecord[]): Promise<void>;
  updateEdits(records: SessionMessageEditRecord[]): Promise<void>;
  markDeleted(records: SessionMessageDeleteRecord[]): Promise<void>;
  markDeletedByChat(params: {
    sessionId: string;
    chatJids: string[];
    deletedAt: Date | null;
    updatedAt: Date;
  }): Promise<void>;
  findRawByMessageId(params: { sessionId: string; messageId: string }): Promise<Record<string, unknown> | null>;
  deleteBySession(sessionId: string): Promise<void>;
  searchByChat(params: {
    sessionId: string;
    chatJids: string[];
    limit: number;
    cursor?: { timestamp: Date; messageId: string };
  }): Promise<SessionMessageRecord[]>;
}
