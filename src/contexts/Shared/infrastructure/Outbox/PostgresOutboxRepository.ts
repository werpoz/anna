import type { Pool } from 'pg';
import type { OutboxMessage } from '@/contexts/Shared/infrastructure/Outbox/OutboxMessage';
import type { OutboxRepository } from '@/contexts/Shared/infrastructure/Outbox/OutboxRepository';

type OutboxRow = {
  id: string;
  event_id: string;
  aggregate_id: string;
  event_name: string;
  occurred_on: Date;
  payload: Record<string, unknown> | string;
  status: string;
  attempts: number;
  last_error: string | null;
};

export class PostgresOutboxRepository implements OutboxRepository {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async add(message: OutboxMessage): Promise<void> {
    await this.pool.query(
      `INSERT INTO outbox_events
        (id, event_id, aggregate_id, event_name, occurred_on, payload, status, attempts, last_error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        message.id,
        message.eventId,
        message.aggregateId,
        message.eventName,
        message.occurredOn,
        JSON.stringify(message.payload),
        message.status,
        message.attempts,
        message.lastError ?? null,
      ]
    );
  }

  async pullPending(limit: number): Promise<Array<OutboxMessage>> {
    const result = await this.pool.query<OutboxRow>(
      `UPDATE outbox_events
         SET status = 'processing',
             attempts = attempts + 1,
             updated_at = now()
       WHERE id IN (
         SELECT id
           FROM outbox_events
          WHERE status = 'pending'
          ORDER BY occurred_on ASC
          LIMIT $1
          FOR UPDATE SKIP LOCKED
       )
       RETURNING id, event_id, aggregate_id, event_name, occurred_on, payload, status, attempts, last_error`,
      [limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      eventId: row.event_id,
      aggregateId: row.aggregate_id,
      eventName: row.event_name,
      occurredOn: row.occurred_on,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      status: 'processing',
      attempts: row.attempts,
      lastError: row.last_error,
    }));
  }

  async markPublished(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE outbox_events
          SET status = 'published',
              published_at = now(),
              updated_at = now()
        WHERE id = $1`,
      [id]
    );
  }

  async markPending(id: string, errorMessage: string): Promise<void> {
    await this.pool.query(
      `UPDATE outbox_events
          SET status = 'pending',
              last_error = $2,
              updated_at = now()
        WHERE id = $1`,
      [id, errorMessage]
    );
  }
}
