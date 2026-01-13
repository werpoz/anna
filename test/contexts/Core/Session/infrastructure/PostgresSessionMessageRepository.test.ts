import { describe, expect, it } from 'bun:test';
import { PostgresSessionMessageRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionMessageRepository';

describe('PostgresSessionMessageRepository', () => {
  it('updates statuses in batch', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const pool = {
      async query(sql: string, params: unknown[]): Promise<{ rows: unknown[] }> {
        calls.push({ sql, params });
        return { rows: [] };
      },
    };
    const repo = new PostgresSessionMessageRepository(pool as any);

    await repo.updateStatuses([
      {
        sessionId: '00000000-0000-0000-0000-000000000001',
        messageId: 'msg-1',
        status: 'read',
        statusAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:01.000Z'),
      },
    ]);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.sql).toContain('UPDATE session_messages');
  });

  it('finds raw message by id', async () => {
    const pool = {
      async query(): Promise<{ rows: Array<{ raw: Record<string, unknown> }> }> {
        return { rows: [{ raw: { key: { id: 'msg-1' } } }] };
      },
    };
    const repo = new PostgresSessionMessageRepository(pool as any);

    const raw = await repo.findRawByMessageId({
      sessionId: '00000000-0000-0000-0000-000000000001',
      messageId: 'msg-1',
    });

    expect(raw?.key).toBeDefined();
  });

  it('updates edits in batch', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const pool = {
      async query(sql: string, params: unknown[]): Promise<{ rows: unknown[] }> {
        calls.push({ sql, params });
        return { rows: [] };
      },
    };
    const repo = new PostgresSessionMessageRepository(pool as any);

    await repo.updateEdits([
      {
        sessionId: '00000000-0000-0000-0000-000000000001',
        messageId: 'msg-1',
        type: 'conversation',
        text: 'editado',
        editedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:01.000Z'),
      },
    ]);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.sql).toContain('UPDATE session_messages');
    expect(calls[0]?.sql).toContain('is_edited');
  });

  it('marks deleted messages in batch', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const pool = {
      async query(sql: string, params: unknown[]): Promise<{ rows: unknown[] }> {
        calls.push({ sql, params });
        return { rows: [] };
      },
    };
    const repo = new PostgresSessionMessageRepository(pool as any);

    await repo.markDeleted([
      {
        sessionId: '00000000-0000-0000-0000-000000000001',
        messageId: 'msg-1',
        deletedAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:01.000Z'),
      },
    ]);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.sql).toContain('is_deleted');
  });

  it('marks deleted messages by chat', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const pool = {
      async query(sql: string, params: unknown[]): Promise<{ rows: unknown[] }> {
        calls.push({ sql, params });
        return { rows: [] };
      },
    };
    const repo = new PostgresSessionMessageRepository(pool as any);

    await repo.markDeletedByChat({
      sessionId: '00000000-0000-0000-0000-000000000001',
      chatJids: ['123@s.whatsapp.net'],
      deletedAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:01.000Z'),
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.sql).toContain('UPDATE session_messages');
    expect(calls[0]?.sql).toContain('is_deleted');
  });
});
