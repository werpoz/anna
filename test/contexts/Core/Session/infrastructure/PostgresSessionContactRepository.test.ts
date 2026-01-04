import { describe, expect, it } from 'bun:test';
import { PostgresSessionContactRepository } from '@/contexts/Core/Session/infrastructure/PostgresSessionContactRepository';

describe('PostgresSessionContactRepository', () => {
  it('upserts contacts in batch', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const pool = {
      async query(sql: string, params: unknown[]): Promise<{ rows: unknown[] }> {
        calls.push({ sql, params });
        return { rows: [] };
      },
    };
    const repo = new PostgresSessionContactRepository(pool as any);

    await repo.upsertMany([
      {
        id: '00000000-0000-0000-0000-000000000001',
        tenantId: '00000000-0000-0000-0000-000000000002',
        sessionId: '00000000-0000-0000-0000-000000000003',
        contactJid: 'jid-1',
        contactLid: null,
        phoneNumber: null,
        name: 'Ada',
        notify: null,
        verifiedName: null,
        imgUrl: null,
        status: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      },
    ]);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.sql).toContain('INSERT INTO session_contacts');
  });

  it('lists contacts by tenant', async () => {
    const pool = {
      async query(): Promise<{ rows: Array<Record<string, unknown>> }> {
        return {
          rows: [
            {
              contact_jid: 'jid-1',
              contact_lid: null,
              phone_number: null,
              name: 'Ada',
              notify: null,
              verified_name: null,
              img_url: null,
              status: null,
            },
          ],
        };
      },
    };
    const repo = new PostgresSessionContactRepository(pool as any);

    const result = await repo.listByTenant('tenant-1');

    expect(result).toHaveLength(1);
    expect(result[0]?.contactJid).toBe('jid-1');
  });
});
