export type SessionMessageMediaRecord = {
  id: string;
  tenantId: string;
  sessionId: string;
  chatJid: string;
  messageId: string;
  kind: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  mime: string | null;
  size: number | null;
  fileName: string | null;
  url: string;
  sha256: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface SessionMessageMediaRepository {
  upsertMany(records: SessionMessageMediaRecord[]): Promise<void>;
  listByMessageIds(params: {
    sessionId: string;
    messageIds: string[];
  }): Promise<SessionMessageMediaRecord[]>;
  deleteBySession(sessionId: string): Promise<void>;
}
