import type { Pool } from 'pg';
import type { SessionAuthRepository } from '@/contexts/Core/Session/domain/SessionAuthRepository';
import type { SessionId } from '@/contexts/Core/Session/domain/SessionId';

export class PostgresSessionAuthRepository implements SessionAuthRepository {
  constructor(private readonly pool: Pool) {}

  async delete(sessionId: SessionId): Promise<void> {
    await this.pool.query('DELETE FROM session_auth_keys WHERE session_id = $1', [sessionId.value]);
    await this.pool.query('DELETE FROM session_auth_creds WHERE session_id = $1', [sessionId.value]);
  }
}
