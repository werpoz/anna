import type { Pool } from 'pg';
import type {
  SessionChatRecord,
  SessionChatRepository,
  SessionChatSummary,
} from '@/contexts/Core/Session/domain/SessionChatRepository';

type SessionChatRow = {
  chat_jid: string;
  chat_name: string | null;
  last_message_id: string | null;
  last_message_ts: Date | string | null;
  last_message_text: string | null;
  last_message_type: string | null;
  unread_count: number;
};

const parseDate = (value: Date | string | null): Date | null => {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
};

export class PostgresSessionChatRepository implements SessionChatRepository {
  constructor(private readonly pool: Pool) { }

  async upsertMany(records: SessionChatRecord[]): Promise<void> {
    if (!records.length) {
      return;
    }

    const columns = [
      'id',
      'tenant_id',
      'session_id',
      'chat_jid',
      'chat_name',
      'last_message_id',
      'last_message_ts',
      'last_message_text',
      'last_message_type',
      'unread_count',
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
        record.chatJid,
        record.chatName,
        record.lastMessageId,
        record.lastMessageTs,
        record.lastMessageText,
        record.lastMessageType,
        record.unreadDelta,
        record.createdAt,
        record.updatedAt
      );
      const slots = columns.map((_, columnIndex) => `$${offset + columnIndex + 1}`);
      return `(${slots.join(', ')})`;
    });

    await this.pool.query(
      `INSERT INTO session_chats (${columns.join(', ')})
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (session_id, chat_jid)
       DO UPDATE SET
         chat_name = COALESCE(EXCLUDED.chat_name, session_chats.chat_name),
         last_message_ts = CASE
           WHEN EXCLUDED.last_message_ts IS NULL THEN session_chats.last_message_ts
           WHEN session_chats.last_message_ts IS NULL THEN EXCLUDED.last_message_ts
           WHEN EXCLUDED.last_message_ts >= session_chats.last_message_ts THEN EXCLUDED.last_message_ts
           ELSE session_chats.last_message_ts
         END,
         last_message_id = CASE
           WHEN EXCLUDED.last_message_ts IS NULL THEN session_chats.last_message_id
           WHEN session_chats.last_message_ts IS NULL THEN EXCLUDED.last_message_id
           WHEN EXCLUDED.last_message_ts >= session_chats.last_message_ts THEN EXCLUDED.last_message_id
           ELSE session_chats.last_message_id
         END,
         last_message_text = CASE
           WHEN EXCLUDED.last_message_ts IS NULL THEN session_chats.last_message_text
           WHEN session_chats.last_message_ts IS NULL THEN EXCLUDED.last_message_text
           WHEN EXCLUDED.last_message_ts >= session_chats.last_message_ts THEN EXCLUDED.last_message_text
           ELSE session_chats.last_message_text
         END,
         last_message_type = CASE
           WHEN EXCLUDED.last_message_ts IS NULL THEN session_chats.last_message_type
           WHEN session_chats.last_message_ts IS NULL THEN EXCLUDED.last_message_type
           WHEN EXCLUDED.last_message_ts >= session_chats.last_message_ts THEN EXCLUDED.last_message_type
           ELSE session_chats.last_message_type
         END,
         unread_count = GREATEST(0, session_chats.unread_count + EXCLUDED.unread_count),
         updated_at = EXCLUDED.updated_at`,
      values
    );
  }

  async listByTenant(tenantId: string, sessionId?: string): Promise<SessionChatSummary[]> {
    const params: Array<string> = [tenantId];
    let where = 'tenant_id = $1';
    if (sessionId) {
      params.push(sessionId);
      where += ' AND sc.session_id = $2';
    }

    const result = await this.pool.query<SessionChatRow>(
      `SELECT sc.chat_jid,
              COALESCE(sc.chat_name, con.name, con.verified_name, con.notify) as chat_name,
              sc.last_message_id,
              sc.last_message_ts,
              sc.last_message_text,
              sc.last_message_type,
              sc.unread_count
         FROM session_chats sc
         LEFT JOIN session_contacts con ON sc.session_id = con.session_id AND (sc.chat_jid = con.contact_jid OR sc.chat_jid = con.contact_lid)
        WHERE sc.${where}
        ORDER BY sc.last_message_ts DESC NULLS LAST`,
      params
    );

    return result.rows.map((row) => ({
      chatJid: row.chat_jid,
      chatName: row.chat_name,
      lastMessageId: row.last_message_id,
      lastMessageTs: parseDate(row.last_message_ts),
      lastMessageText: row.last_message_text,
      lastMessageType: row.last_message_type,
      unreadCount: row.unread_count,
    }));
  }

  async deleteBySession(sessionId: string): Promise<void> {
    await this.pool.query('DELETE FROM session_chats WHERE session_id = $1', [sessionId]);
  }
}
