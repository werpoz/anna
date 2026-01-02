import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';

type AppliedMigrationRow = { id: string };

const migrationsDir = join(process.cwd(), 'database', 'migrations');

const ensureMigrationsTable = async (pool: Pool): Promise<void> => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       id text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`
  );
};

const fetchAppliedMigrations = async (pool: Pool): Promise<Set<string>> => {
  const result = await pool.query<AppliedMigrationRow>('SELECT id FROM schema_migrations');
  return new Set(result.rows.map((row) => row.id));
};

const runMigration = async (pool: Pool, id: string, sql: string): Promise<void> => {
  await pool.query('BEGIN');
  try {
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (id) VALUES ($1)', [id]);
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
};

const loadMigrationFiles = async (): Promise<string[]> => {
  const entries = await readdir(migrationsDir);
  return entries.filter((entry) => entry.endsWith('.sql')).sort();
};

const main = async (): Promise<void> => {
  const pool = new Pool({ connectionString: env.databaseUrl });
  try {
    await ensureMigrationsTable(pool);
    const applied = await fetchAppliedMigrations(pool);
    const files = await loadMigrationFiles();

    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      const filePath = join(migrationsDir, file);
      const sql = await readFile(filePath, 'utf8');
      const id = basename(filePath);

      console.log(`[db:migrate] applying ${id}`);
      await runMigration(pool, id, sql);
    }
  } finally {
    await pool.end();
  }
};

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[db:migrate] failed: ${message}`);
  process.exitCode = 1;
}
