import { describe, it, expect } from 'bun:test';
import { PostgresOutboxRepository } from '@/contexts/Shared/infrastructure/Outbox/PostgresOutboxRepository';
import type { OutboxMessage } from '@/contexts/Shared/infrastructure/Outbox/OutboxMessage';

class FakePool {
  public queries: Array<{ text: string; values: unknown[] }> = [];
  public rows: any[] = [];

  async query<T>(text: string, values: unknown[]): Promise<{ rows: T[] }> {
    this.queries.push({ text, values });
    return { rows: this.rows as T[] };
  }
}

const buildMessage = (): OutboxMessage => ({
  id: '1',
  eventId: 'evt',
  aggregateId: 'agg',
  eventName: 'test.event',
  occurredOn: new Date('2024-01-01T00:00:00.000Z'),
  payload: { ok: true },
  status: 'pending',
  attempts: 0,
});

describe('PostgresOutboxRepository', () => {
  it('inserts outbox message', async () => {
    const pool = new FakePool();
    const repo = new PostgresOutboxRepository(pool as any);
    await repo.add(buildMessage());

    expect(pool.queries).toHaveLength(1);
    const firstQuery = pool.queries[0]!;
    expect(firstQuery.text).toContain('INSERT INTO outbox_events');
  });

  it('pulls pending messages', async () => {
    const pool = new FakePool();
    pool.rows = [
      {
        id: '1',
        event_id: 'evt',
        aggregate_id: 'agg',
        event_name: 'test.event',
        occurred_on: new Date('2024-01-01T00:00:00.000Z'),
        payload: JSON.stringify({ ok: true }),
        status: 'pending',
        attempts: 1,
        last_error: null,
      },
    ];
    const repo = new PostgresOutboxRepository(pool as any);
    const messages = await repo.pullPending(10);

    expect(messages).toHaveLength(1);
    const firstMessage = messages[0]!;
    expect(firstMessage.eventName).toBe('test.event');
    expect(firstMessage.payload).toEqual({ ok: true });
  });

  it('marks published', async () => {
    const pool = new FakePool();
    const repo = new PostgresOutboxRepository(pool as any);
    await repo.markPublished('1');

    const firstQuery = pool.queries[0]!;
    expect(firstQuery.text).toContain('UPDATE outbox_events');
  });
});
