import type { Pool } from 'pg';
import type {
  SessionMessageRecord,
  SessionMessageRepository,
  SessionMessageStatusRecord,
} from '@/contexts/Core/Session/domain/SessionMessageRepository';

export class PostgresSessionMessageRepository implements SessionMessageRepository {
  constructor(private readonly pool: Pool) {}

  async upsertMany(records: SessionMessageRecord[]): Promise<void> {
    if (!records.length) {
      return;
    }

    const columns = [
      'id',
      'tenant_id',
      'session_id',
      'chat_jid',
      'message_id',
      'from_me',
      'sender_jid',
      'timestamp',
      'type',
      'text',
      'raw',
      'status',
      'status_at',
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
        record.messageId,
        record.fromMe,
        record.senderJid,
        record.timestamp,
        record.type,
        record.text,
        record.raw ? JSON.stringify(record.raw) : null,
        record.status,
        record.statusAt,
        record.createdAt,
        record.updatedAt
      );
      const slots = columns.map((_, columnIndex) => `$${offset + columnIndex + 1}`);
      return `(${slots.join(', ')})`;
    });

    await this.pool.query(
      `INSERT INTO session_messages (${columns.join(', ')})
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (session_id, message_id)
       DO UPDATE SET
         chat_jid = EXCLUDED.chat_jid,
         from_me = EXCLUDED.from_me,
         sender_jid = EXCLUDED.sender_jid,
         timestamp = EXCLUDED.timestamp,
         type = EXCLUDED.type,
         text = EXCLUDED.text,
         raw = EXCLUDED.raw,
         status = COALESCE(EXCLUDED.status, session_messages.status),
         status_at = COALESCE(EXCLUDED.status_at, session_messages.status_at),
         updated_at = EXCLUDED.updated_at`,
      values
    );
  }

  async updateStatuses(records: SessionMessageStatusRecord[]): Promise<void> {
    if (!records.length) {
      return;
    }

    const columns = ['session_id', 'message_id', 'status', 'status_at', 'updated_at'];
    const values: Array<unknown> = [];
    const placeholders = records.map((record, index) => {
      const offset = index * columns.length;
      values.push(
        record.sessionId,
        record.messageId,
        record.status,
        record.statusAt,
        record.updatedAt
      );
      const slots = columns.map((_, columnIndex) => `$${offset + columnIndex + 1}`);
      return `(${slots.join(', ')})`;
    });

    await this.pool.query(
      `UPDATE session_messages AS sm
         SET status = COALESCE(v.status, sm.status),
             status_at = COALESCE(v.status_at, sm.status_at),
             updated_at = v.updated_at
        FROM (VALUES ${placeholders.join(', ')})
          AS v(session_id, message_id, status, status_at, updated_at)
       WHERE sm.session_id = v.session_id::uuid
         AND sm.message_id = v.message_id`,
      values
    );
  }

  async findRawByMessageId(params: {
    sessionId: string;
    messageId: string;
  }): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `SELECT raw
         FROM session_messages
        WHERE session_id = $1::uuid
          AND message_id = $2
        LIMIT 1`,
      [params.sessionId, params.messageId]
    );

    const row = result.rows[0];
    return row?.raw ?? null;
  }

  async deleteBySession(sessionId: string): Promise<void> {
    await this.pool.query('DELETE FROM session_messages WHERE session_id = $1', [sessionId]);
  }

  async searchByChat(params: {
    sessionId: string;
    chatJid: string;
    limit: number;
    cursor?: { timestamp: Date; messageId: string };
  }): Promise<SessionMessageRecord[]> {
    const { sessionId, chatJid, limit, cursor } = params;
    const values: Array<unknown> = [sessionId, chatJid, limit];
    let cursorClause = '';

    if (cursor?.timestamp && cursor.messageId) {
      values.push(cursor.timestamp, cursor.messageId);
      cursorClause = `AND (timestamp < $4 OR (timestamp = $4 AND message_id < $5))`;
    }

    const result = await this.pool.query(
      `SELECT id, tenant_id, session_id, chat_jid, message_id, from_me, sender_jid, timestamp,
              type, text, raw, status, status_at, created_at, updated_at
         FROM session_messages
        WHERE session_id = $1
          AND chat_jid = $2
          ${cursorClause}
        ORDER BY timestamp DESC NULLS LAST, message_id DESC
        LIMIT $3`,
      values
    );

    return result.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      sessionId: row.session_id,
      chatJid: row.chat_jid,
      messageId: row.message_id,
      fromMe: row.from_me,
      senderJid: row.sender_jid,
      timestamp: row.timestamp,
      type: row.type,
      text: row.text,
      raw: row.raw,
      status: row.status,
      statusAt: row.status_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}
