import type { Pool } from 'pg';
import type {
  SessionMessageReactionRecord,
  SessionMessageReactionRepository,
  SessionMessageReactionSummary,
} from '@/contexts/Core/Session/domain/SessionMessageReactionRepository';

type ReactionSummaryRow = {
  message_id: string;
  emoji: string;
  count: string | number;
  actors: string[];
};

type ReactionRow = {
  id: string;
  tenant_id: string;
  session_id: string;
  chat_jid: string;
  message_id: string;
  actor_jid: string;
  from_me: boolean;
  emoji: string | null;
  reacted_at: Date | string | null;
  is_removed: boolean;
  created_at: Date;
  updated_at: Date;
};

const parseDate = (value: Date | string | null): Date | null => {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
};

export class PostgresSessionMessageReactionRepository implements SessionMessageReactionRepository {
  constructor(private readonly pool: Pool) {}

  async upsertMany(records: SessionMessageReactionRecord[]): Promise<void> {
    if (!records.length) {
      return;
    }

    const columns = [
      'id',
      'tenant_id',
      'session_id',
      'chat_jid',
      'message_id',
      'actor_jid',
      'from_me',
      'emoji',
      'reacted_at',
      'is_removed',
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
        record.actorJid,
        record.fromMe,
        record.emoji,
        record.reactedAt,
        record.isRemoved,
        record.createdAt,
        record.updatedAt
      );
      const slots = columns.map((_, columnIndex) => `$${offset + columnIndex + 1}`);
      return `(${slots.join(', ')})`;
    });

    await this.pool.query(
      `INSERT INTO session_message_reactions (${columns.join(', ')})
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (session_id, message_id, actor_jid)
       DO UPDATE SET
         emoji = EXCLUDED.emoji,
         reacted_at = COALESCE(EXCLUDED.reacted_at, session_message_reactions.reacted_at),
         is_removed = EXCLUDED.is_removed,
         updated_at = EXCLUDED.updated_at`,
      values
    );
  }

  async listByMessageIds(params: {
    sessionId: string;
    messageIds: string[];
  }): Promise<SessionMessageReactionSummary[]> {
    if (!params.messageIds.length) {
      return [];
    }

    const result = await this.pool.query<ReactionSummaryRow>(
      `SELECT message_id,
              emoji,
              COUNT(*) AS count,
              ARRAY_AGG(actor_jid) AS actors
         FROM session_message_reactions
        WHERE session_id = $1::uuid
          AND message_id = ANY($2::text[])
          AND is_removed = false
          AND emoji IS NOT NULL
        GROUP BY message_id, emoji`,
      [params.sessionId, params.messageIds]
    );

    return result.rows.map((row) => ({
      messageId: row.message_id,
      emoji: row.emoji,
      count: Number(row.count),
      actors: row.actors ?? [],
    }));
  }

  async listByMessage(params: {
    sessionId: string;
    messageId: string;
  }): Promise<SessionMessageReactionRecord[]> {
    const result = await this.pool.query<ReactionRow>(
      `SELECT id, tenant_id, session_id, chat_jid, message_id, actor_jid, from_me,
              emoji, reacted_at, is_removed, created_at, updated_at
         FROM session_message_reactions
        WHERE session_id = $1::uuid
          AND message_id = $2
        ORDER BY updated_at DESC`,
      [params.sessionId, params.messageId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      sessionId: row.session_id,
      chatJid: row.chat_jid,
      messageId: row.message_id,
      actorJid: row.actor_jid,
      fromMe: row.from_me,
      emoji: row.emoji,
      reactedAt: parseDate(row.reacted_at),
      isRemoved: row.is_removed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async deleteBySession(sessionId: string): Promise<void> {
    await this.pool.query('DELETE FROM session_message_reactions WHERE session_id = $1', [sessionId]);
  }
}
