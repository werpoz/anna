import type { Pool } from 'pg';
import type {
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '@/contexts/Core/Auth/domain/RefreshTokenRepository';

type RefreshTokenRow = {
  token_hash: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by_token_hash: string | null;
  user_agent: string | null;
  ip: string | null;
};

const mapRowToRecord = (row: RefreshTokenRow): RefreshTokenRecord => ({
  tokenHash: row.token_hash,
  userId: row.user_id,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  revokedAt: row.revoked_at,
  replacedByTokenHash: row.replaced_by_token_hash,
  userAgent: row.user_agent ?? undefined,
  ip: row.ip ?? undefined,
});

export class PostgresRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly pool: Pool) {}

  async create(record: RefreshTokenRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO refresh_tokens
        (token_hash, user_id, created_at, expires_at, revoked_at, replaced_by_token_hash, user_agent, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        record.tokenHash,
        record.userId,
        record.createdAt,
        record.expiresAt,
        record.revokedAt,
        record.replacedByTokenHash,
        record.userAgent ?? null,
        record.ip ?? null,
      ]
    );
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const result = await this.pool.query<RefreshTokenRow>(
      `SELECT token_hash, user_id, created_at, expires_at, revoked_at, replaced_by_token_hash, user_agent, ip
         FROM refresh_tokens
        WHERE token_hash = $1
        LIMIT 1`,
      [tokenHash]
    );

    const row = result.rows[0];
    return row ? mapRowToRecord(row) : null;
  }

  async revoke(tokenHash: string, replacedByTokenHash?: string): Promise<void> {
    await this.pool.query(
      `UPDATE refresh_tokens
          SET revoked_at = now(),
              replaced_by_token_hash = $2
        WHERE token_hash = $1`,
      [tokenHash, replacedByTokenHash ?? null]
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE refresh_tokens
          SET revoked_at = now()
        WHERE user_id = $1
          AND revoked_at IS NULL`,
      [userId]
    );
  }
}
