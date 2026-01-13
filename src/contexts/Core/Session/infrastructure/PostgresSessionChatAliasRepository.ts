import type { Pool } from 'pg';
import type {
  SessionChatAliasRecord,
  SessionChatAliasRepository,
} from '@/contexts/Core/Session/domain/SessionChatAliasRepository';

type ChatAliasRow = {
  alias: string;
  chat_key: string;
};

export class PostgresSessionChatAliasRepository implements SessionChatAliasRepository {
  constructor(private readonly pool: Pool) { }

  async resolveChatKey(params: { sessionId: string; alias: string }): Promise<string | null> {
    const result = await this.pool.query<{ chat_key: string }>(
      `SELECT chat_key
         FROM session_chat_aliases
        WHERE session_id = $1
          AND alias = $2
        LIMIT 1`,
      [params.sessionId, params.alias]
    );

    return result.rows[0]?.chat_key ?? null;
  }

  async resolveMany(params: { sessionId: string; aliases: string[] }): Promise<Map<string, string>> {
    if (!params.aliases.length) {
      return new Map();
    }

    const result = await this.pool.query<ChatAliasRow>(
      `SELECT alias, chat_key
         FROM session_chat_aliases
        WHERE session_id = $1
          AND alias = ANY($2::text[])`,
      [params.sessionId, params.aliases]
    );

    return result.rows.reduce((map, row) => {
      map.set(row.alias, row.chat_key);
      return map;
    }, new Map<string, string>());
  }

  async listAliasesByChatKey(params: { sessionId: string; chatKey: string }): Promise<string[]> {
    const result = await this.pool.query<{ alias: string }>(
      `SELECT alias
         FROM session_chat_aliases
        WHERE session_id = $1
          AND chat_key = $2`,
      [params.sessionId, params.chatKey]
    );

    return result.rows.map((row) => row.alias);
  }

  async upsertMany(records: SessionChatAliasRecord[]): Promise<void> {
    if (!records.length) {
      return;
    }

    const columns = [
      'id',
      'tenant_id',
      'session_id',
      'chat_key',
      'alias',
      'alias_type',
      'created_at',
      'updated_at',
    ];

    const values: Array<unknown> = [];
    const placeholders = records.map((record, index) => {
      const offset = index * columns.length;
      values.push(
        record.id,
        record.tenantId,
        record.sessionId,
        record.chatKey,
        record.alias,
        record.aliasType,
        record.createdAt,
        record.updatedAt
      );
      const slots = columns.map((_, columnIndex) => `$${offset + columnIndex + 1}`);
      return `(${slots.join(', ')})`;
    });

    await this.pool.query(
      `INSERT INTO session_chat_aliases (${columns.join(', ')})
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (session_id, alias)
       DO UPDATE SET
         chat_key = EXCLUDED.chat_key,
         alias_type = EXCLUDED.alias_type,
         updated_at = EXCLUDED.updated_at`,
      values
    );
  }

  async mergeChatKeys(params: { sessionId: string; fromChatKey: string; toChatKey: string }): Promise<void> {
    if (params.fromChatKey === params.toChatKey) {
      return;
    }

    await this.pool.query(
      `UPDATE session_chat_aliases
          SET chat_key = $3,
              updated_at = $4
        WHERE session_id = $1
          AND chat_key = $2`,
      [params.sessionId, params.fromChatKey, params.toChatKey, new Date()]
    );
  }

  async deleteBySession(sessionId: string): Promise<void> {
    await this.pool.query('DELETE FROM session_chat_aliases WHERE session_id = $1', [sessionId]);
  }
}
