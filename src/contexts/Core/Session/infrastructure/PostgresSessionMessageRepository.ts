import type { Pool } from 'pg';
import type {
  SessionMessageRecord,
  SessionMessageRepository,
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
         updated_at = EXCLUDED.updated_at`,
      values
    );
  }

  async deleteBySession(sessionId: string): Promise<void> {
    await this.pool.query('DELETE FROM session_messages WHERE session_id = $1', [sessionId]);
  }
}
