import { describe, it, expect } from 'bun:test';
import { PostgresDeadLetterRepository } from '@/contexts/Shared/infrastructure/DeadLetter/PostgresDeadLetterRepository';

class FakePool {
  public queries: Array<{ text: string; values: unknown[] }> = [];

  async query(text: string, values: unknown[]): Promise<void> {
    this.queries.push({ text, values });
  }
}

describe('PostgresDeadLetterRepository', () => {
  it('inserts dead letter message', async () => {
    const pool = new FakePool();
    const repo = new PostgresDeadLetterRepository(pool as any);

    await repo.add({
      id: '1',
      eventId: 'evt',
      aggregateId: 'agg',
      eventName: 'test.event',
      occurredOn: new Date('2024-01-01T00:00:00.000Z'),
      payload: { ok: true },
      error: 'boom',
      attempts: 2,
    });

    expect(pool.queries).toHaveLength(1);
    expect(pool.queries[0]!.text).toContain('INSERT INTO dead_letters');
  });
});
