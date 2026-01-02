import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';

const outboxFile = join(process.cwd(), 'database', 'outbox.sql');

const main = async (): Promise<void> => {
  const pool = new Pool({ connectionString: env.databaseUrl });
  try {
    const sql = await readFile(outboxFile, 'utf8');
    console.log('[db:outbox] applying outbox schema');
    await pool.query(sql);
  } finally {
    await pool.end();
  }
};

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[db:outbox] failed: ${message}`);
  process.exitCode = 1;
}
