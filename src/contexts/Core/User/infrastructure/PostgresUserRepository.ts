import type { Pool } from 'pg';
import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import { User } from '@/contexts/Core/User/domain/User';
import { UserEmail } from '@/contexts/Core/User/domain/UserEmail';
import { UserId } from '@/contexts/Core/User/domain/UserId';
import type { UserPrimitives } from '@/contexts/Core/User/domain/User';

type UserRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  password_hash: string;
  verification_token: string;
  verification_code: string;
  verification_token_expires_at: Date | string;
  verified_at: Date | string | null;
  password_reset_token: string | null;
  password_reset_token_expires_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  last_login_at: Date | string | null;
};

const toIsoString = (value: Date | string | null): string | null => {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

const mapRowToUser = (row: UserRow): User => {
  const primitives: UserPrimitives = {
    id: row.id,
    name: row.name,
    email: row.email,
    status: row.status as UserPrimitives['status'],
    passwordHash: row.password_hash,
    verificationToken: row.verification_token,
    verificationCode: row.verification_code,
    verificationTokenExpiresAt: toIsoString(row.verification_token_expires_at) as string,
    verifiedAt: toIsoString(row.verified_at),
    passwordResetToken: row.password_reset_token,
    passwordResetTokenExpiresAt: toIsoString(row.password_reset_token_expires_at),
    createdAt: toIsoString(row.created_at) as string,
    updatedAt: toIsoString(row.updated_at) as string,
    lastLoginAt: toIsoString(row.last_login_at),
  };

  return User.fromPrimitives(primitives);
};

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async save(user: User): Promise<void> {
    const primitives = user.toPrimitives();
    await this.pool.query(
      `INSERT INTO users
        (id, name, email, status, password_hash, verification_token, verification_code,
         verification_token_expires_at, verified_at, password_reset_token, password_reset_token_expires_at,
         created_at, updated_at, last_login_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         status = EXCLUDED.status,
         password_hash = EXCLUDED.password_hash,
         verification_token = EXCLUDED.verification_token,
         verification_code = EXCLUDED.verification_code,
         verification_token_expires_at = EXCLUDED.verification_token_expires_at,
         verified_at = EXCLUDED.verified_at,
         password_reset_token = EXCLUDED.password_reset_token,
         password_reset_token_expires_at = EXCLUDED.password_reset_token_expires_at,
         updated_at = EXCLUDED.updated_at,
         last_login_at = EXCLUDED.last_login_at`,
      [
        primitives.id,
        primitives.name,
        primitives.email,
        primitives.status,
        primitives.passwordHash,
        primitives.verificationToken,
        primitives.verificationCode ?? primitives.verificationToken,
        primitives.verificationTokenExpiresAt,
        primitives.verifiedAt,
        primitives.passwordResetToken,
        primitives.passwordResetTokenExpiresAt,
        primitives.createdAt,
        primitives.updatedAt,
        primitives.lastLoginAt,
      ]
    );
  }

  async search(id: UserId): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT id, name, email, status, password_hash, verification_token, verification_code,
              verification_token_expires_at, verified_at, password_reset_token, password_reset_token_expires_at,
              created_at, updated_at, last_login_at
         FROM users
        WHERE id = $1
        LIMIT 1`,
      [id.value]
    );

    const row = result.rows[0];
    return row ? mapRowToUser(row) : null;
  }

  async searchByEmail(email: UserEmail): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT id, name, email, status, password_hash, verification_token, verification_code,
              verification_token_expires_at, verified_at, password_reset_token, password_reset_token_expires_at,
              created_at, updated_at, last_login_at
         FROM users
        WHERE email = $1
        LIMIT 1`,
      [email.value]
    );

    const row = result.rows[0];
    return row ? mapRowToUser(row) : null;
  }
}
