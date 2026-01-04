import type { Pool } from 'pg';
import type {
  SessionMessageMediaRecord,
  SessionMessageMediaRepository,
} from '@/contexts/Core/Session/domain/SessionMessageMediaRepository';

type MediaRow = {
  id: string;
  tenant_id: string;
  session_id: string;
  chat_jid: string;
  message_id: string;
  kind: string;
  mime: string | null;
  size: string | number | null;
  file_name: string | null;
  url: string;
  sha256: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  created_at: Date;
  updated_at: Date;
};

export class PostgresSessionMessageMediaRepository implements SessionMessageMediaRepository {
  constructor(private readonly pool: Pool) {}

  async upsertMany(records: SessionMessageMediaRecord[]): Promise<void> {
    if (!records.length) {
      return;
    }

    const columns = [
      'id',
      'tenant_id',
      'session_id',
      'chat_jid',
      'message_id',
      'kind',
      'mime',
      'size',
      'file_name',
      'url',
      'sha256',
      'width',
      'height',
      'duration',
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
        record.kind,
        record.mime,
        record.size,
        record.fileName,
        record.url,
        record.sha256,
        record.width,
        record.height,
        record.duration,
        record.createdAt,
        record.updatedAt
      );
      const slots = columns.map((_, columnIndex) => `$${offset + columnIndex + 1}`);
      return `(${slots.join(', ')})`;
    });

    await this.pool.query(
      `INSERT INTO session_message_media (${columns.join(', ')})
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (session_id, message_id, kind)
       DO UPDATE SET
         mime = EXCLUDED.mime,
         size = EXCLUDED.size,
         file_name = EXCLUDED.file_name,
         url = EXCLUDED.url,
         sha256 = EXCLUDED.sha256,
         width = EXCLUDED.width,
         height = EXCLUDED.height,
         duration = EXCLUDED.duration,
         updated_at = EXCLUDED.updated_at`,
      values
    );
  }

  async listByMessageIds(params: {
    sessionId: string;
    messageIds: string[];
  }): Promise<SessionMessageMediaRecord[]> {
    if (!params.messageIds.length) {
      return [];
    }

    const result = await this.pool.query<MediaRow>(
      `SELECT id, tenant_id, session_id, chat_jid, message_id, kind, mime, size,
              file_name, url, sha256, width, height, duration, created_at, updated_at
         FROM session_message_media
        WHERE session_id = $1::uuid
          AND message_id = ANY($2::text[])`,
      [params.sessionId, params.messageIds]
    );

    return result.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      sessionId: row.session_id,
      chatJid: row.chat_jid,
      messageId: row.message_id,
      kind: row.kind as SessionMessageMediaRecord['kind'],
      mime: row.mime,
      size: row.size !== null ? Number(row.size) : null,
      fileName: row.file_name,
      url: row.url,
      sha256: row.sha256,
      width: row.width,
      height: row.height,
      duration: row.duration,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async deleteBySession(sessionId: string): Promise<void> {
    await this.pool.query('DELETE FROM session_message_media WHERE session_id = $1', [sessionId]);
  }
}
