import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';

const quoteIdent = (value: string): string => `"${value.replace(/"/g, '""')}"`;

const main = async (): Promise<void> => {
  const url = new URL(env.databaseUrl);
  const dbName = url.pathname.replace('/', '');
  if (!dbName) {
    throw new Error('DATABASE_URL is missing a database name');
  }

  const adminUrl = new URL(env.databaseUrl);
  const adminDb = dbName === 'postgres' ? 'template1' : 'postgres';
  adminUrl.pathname = `/${adminDb}`;

  const pool = new Pool({ connectionString: adminUrl.toString() });

  try {
    await pool.query(
      `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
        WHERE datname = $1
          AND pid <> pg_backend_pid()`,
      [dbName]
    );

    const quoted = quoteIdent(dbName);
    await pool.query(`DROP DATABASE IF EXISTS ${quoted}`);
    await pool.query(`CREATE DATABASE ${quoted}`);
    console.log(`[db:reset] dropped + created database ${dbName}`);
  } finally {
    await pool.end();
  }
};

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[db:reset] failed: ${message}`);
  process.exitCode = 1;
}
