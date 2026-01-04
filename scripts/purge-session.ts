import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';

const args = process.argv.slice(2);
const sessionId = args[0];
const databaseUrlArg = args[1];
const purgeAll = sessionId === '--all' || sessionId === 'all';

const isUuid = (value: string): boolean => /^[0-9a-fA-F-]{36}$/.test(value);

const main = async (): Promise<void> => {
  if (!sessionId) {
    console.error('Usage: bun run db:purge-session <session_id> [database_url]');
    console.error('   or: bun run db:purge-session --all [database_url]');
    process.exitCode = 1;
    return;
  }

  if (!purgeAll && !isUuid(sessionId)) {
    console.error('session_id must be a UUID.');
    process.exitCode = 1;
    return;
  }

  const databaseUrl = databaseUrlArg || env.databaseUrl;
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query('BEGIN');
    if (purgeAll) {
      await pool.query('DELETE FROM session_messages');
      await pool.query('DELETE FROM session_chats');
      await pool.query('DELETE FROM session_auth_keys');
      await pool.query('DELETE FROM session_auth_creds');
      await pool.query('DELETE FROM sessions');
      await pool.query('COMMIT');
      console.log('[db:purge-session] ok: all sessions removed');
    } else {
      await pool.query('DELETE FROM session_messages WHERE session_id = $1::uuid', [sessionId]);
      await pool.query('DELETE FROM session_chats WHERE session_id = $1::uuid', [sessionId]);
      await pool.query('DELETE FROM session_auth_keys WHERE session_id = $1', [sessionId]);
      await pool.query('DELETE FROM session_auth_creds WHERE session_id = $1', [sessionId]);
      await pool.query('DELETE FROM sessions WHERE id = $1::uuid', [sessionId]);
      await pool.query('COMMIT');
      console.log(`[db:purge-session] ok: ${sessionId}`);
    }
  } catch (error) {
    await pool.query('ROLLBACK');
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[db:purge-session] failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

await main();
