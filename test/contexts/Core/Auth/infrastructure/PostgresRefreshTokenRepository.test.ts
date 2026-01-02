import { describe, it, expect } from 'bun:test';
import { PostgresRefreshTokenRepository } from '@/contexts/Core/Auth/infrastructure/PostgresRefreshTokenRepository';

const buildRecord = () => ({
  tokenHash: 'hash-1',
  userId: 'user-1',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  expiresAt: new Date('2024-02-01T00:00:00.000Z'),
  revokedAt: null,
  replacedByTokenHash: null,
  userAgent: 'agent',
  ip: '127.0.0.1',
});

describe('PostgresRefreshTokenRepository', () => {
  it('creates refresh token records', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const pool = {
      async query(sql: string, params: unknown[]): Promise<{ rows: unknown[] }> {
        calls.push({ sql, params });
        return { rows: [] };
      },
    };
    const repo = new PostgresRefreshTokenRepository(pool as any);

    await repo.create(buildRecord());

    expect(calls).toHaveLength(1);
    expect(calls[0]?.params[0]).toBe('hash-1');
    expect(calls[0]?.params[1]).toBe('user-1');
  });

  it('finds refresh token records', async () => {
    const record = buildRecord();
    const row = {
      token_hash: record.tokenHash,
      user_id: record.userId,
      created_at: record.createdAt,
      expires_at: record.expiresAt,
      revoked_at: record.revokedAt,
      replaced_by_token_hash: record.replacedByTokenHash,
      user_agent: record.userAgent,
      ip: record.ip,
    };
    const pool = {
      async query(): Promise<{ rows: unknown[] }> {
        return { rows: [row] };
      },
    };
    const repo = new PostgresRefreshTokenRepository(pool as any);

    const found = await repo.findByTokenHash(record.tokenHash);

    expect(found?.tokenHash).toBe(record.tokenHash);
    expect(found?.userId).toBe(record.userId);
  });

  it('returns null when refresh token is missing', async () => {
    const pool = {
      async query(): Promise<{ rows: unknown[] }> {
        return { rows: [] };
      },
    };
    const repo = new PostgresRefreshTokenRepository(pool as any);

    const found = await repo.findByTokenHash('missing');

    expect(found).toBeNull();
  });

  it('revokes a refresh token', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const pool = {
      async query(sql: string, params: unknown[]): Promise<{ rows: unknown[] }> {
        calls.push({ sql, params });
        return { rows: [] };
      },
    };
    const repo = new PostgresRefreshTokenRepository(pool as any);

    await repo.revoke('hash-1', 'hash-2');

    expect(calls[0]?.params).toEqual(['hash-1', 'hash-2']);
  });

  it('revokes all refresh tokens for a user', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const pool = {
      async query(sql: string, params: unknown[]): Promise<{ rows: unknown[] }> {
        calls.push({ sql, params });
        return { rows: [] };
      },
    };
    const repo = new PostgresRefreshTokenRepository(pool as any);

    await repo.revokeAllForUser('user-1');

    expect(calls[0]?.params).toEqual(['user-1']);
  });
});
