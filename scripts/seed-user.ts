import { Pool } from 'pg';
import { env } from '@/contexts/Shared/infrastructure/config/env';

const DEFAULT_SEED_EMAIL = 'dev@anna.local';
const DEFAULT_SEED_PASSWORD = 'SuperSecure123!';
const DEFAULT_SEED_NAME = 'Dev User';

const main = async (): Promise<void> => {
  const email = process.env.SEED_USER_EMAIL ?? DEFAULT_SEED_EMAIL;
  const password = process.env.SEED_USER_PASSWORD ?? DEFAULT_SEED_PASSWORD;
  const name = process.env.SEED_USER_NAME ?? DEFAULT_SEED_NAME;

  const pool = new Pool({ connectionString: env.databaseUrl });
  try {
    const now = new Date();
    const passwordHash = await Bun.password.hash(password);
    const verificationToken = crypto.randomUUID();
    const verificationCode = verificationToken.slice(0, 6);

    const result = await pool.query<{ id: string }>(
      `INSERT INTO users
        (id, name, email, status, password_hash, verification_token, verification_code,
         verification_token_expires_at, verified_at, password_reset_token, password_reset_token_expires_at,
         created_at, updated_at, last_login_at)
       VALUES
        ($1, $2, $3, 'active', $4, $5, $6, $7, $8, NULL, NULL, $9, $10, NULL)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [
        crypto.randomUUID(),
        name,
        email,
        passwordHash,
        verificationToken,
        verificationCode,
        now,
        now,
        now,
        now,
      ]
    );

    if (result.rows[0]) {
      console.log(`[db:seed-user] created ${email}`);
    } else {
      console.log(`[db:seed-user] exists ${email}`);
    }
  } finally {
    await pool.end();
  }
};

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[db:seed-user] failed: ${message}`);
  process.exitCode = 1;
}
