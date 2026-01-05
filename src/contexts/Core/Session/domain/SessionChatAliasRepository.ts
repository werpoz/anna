export type SessionChatAliasType = 'jid' | 'lid' | 'waid';

export type SessionChatAliasRecord = {
  id: string;
  tenantId: string;
  sessionId: string;
  chatKey: string;
  alias: string;
  aliasType: SessionChatAliasType;
  createdAt: Date;
  updatedAt: Date;
};

export interface SessionChatAliasRepository {
  resolveChatKey(params: { sessionId: string; alias: string }): Promise<string | null>;
  resolveMany(params: { sessionId: string; aliases: string[] }): Promise<Map<string, string>>;
  listAliasesByChatKey(params: { sessionId: string; chatKey: string }): Promise<string[]>;
  upsertMany(records: SessionChatAliasRecord[]): Promise<void>;
  mergeChatKeys(params: { sessionId: string; fromChatKey: string; toChatKey: string }): Promise<void>;
  deleteBySession(sessionId: string): Promise<void>;
}
