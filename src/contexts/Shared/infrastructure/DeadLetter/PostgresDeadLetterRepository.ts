import type { Pool } from 'pg';
import type { DeadLetterMessage } from './DeadLetterMessage';
import type { DeadLetterRepository } from './DeadLetterRepository';

export class PostgresDeadLetterRepository implements DeadLetterRepository {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async add(message: DeadLetterMessage): Promise<void> {
    await this.pool.query(
      `INSERT INTO dead_letters
        (id, event_id, aggregate_id, event_name, occurred_on, payload, error, attempts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        message.id,
        message.eventId,
        message.aggregateId,
        message.eventName,
        message.occurredOn,
        JSON.stringify(message.payload),
        message.error,
        message.attempts,
      ]
    );
  }
}
