import { describe, it, expect } from 'bun:test';
import { PostgresUserRepository } from '@/contexts/Core/User/infrastructure/PostgresUserRepository';
import { User } from '@/contexts/Core/User/domain/User';
import { UserId } from '@/contexts/Core/User/domain/UserId';
import { UserName } from '@/contexts/Core/User/domain/UserName';
import { UserEmail } from '@/contexts/Core/User/domain/UserEmail';
import { UserPasswordHash } from '@/contexts/Core/User/domain/UserPasswordHash';

const buildUser = (): User =>
  User.create({
    id: new UserId('11111111-1111-1111-1111-111111111111'),
    name: new UserName('Ada Lovelace'),
    email: new UserEmail('ada@example.com'),
    passwordHash: new UserPasswordHash('hashed-password'),
  });

describe('PostgresUserRepository', () => {
  it('saves users with an upsert', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const pool = {
      async query(sql: string, params: unknown[]): Promise<{ rows: unknown[] }> {
        calls.push({ sql, params });
        return { rows: [] };
      },
    };
    const repo = new PostgresUserRepository(pool as any);
    const user = buildUser();

    await repo.save(user);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.params[0]).toBe(user.id.value);
    expect(calls[0]?.params[2]).toBe(user.email.value);
  });

  it('returns a user by id', async () => {
    const user = buildUser();
    const primitives = user.toPrimitives();
    const row = {
      id: primitives.id,
      name: primitives.name,
      email: primitives.email,
      status: primitives.status,
      password_hash: primitives.passwordHash,
      verification_token: primitives.verificationToken,
      verification_code: primitives.verificationCode ?? primitives.verificationToken,
      verification_token_expires_at: new Date(primitives.verificationTokenExpiresAt),
      verified_at: primitives.verifiedAt ? new Date(primitives.verifiedAt) : null,
      password_reset_token: primitives.passwordResetToken,
      password_reset_token_expires_at: primitives.passwordResetTokenExpiresAt
        ? new Date(primitives.passwordResetTokenExpiresAt)
        : null,
      created_at: new Date(primitives.createdAt),
      updated_at: new Date(primitives.updatedAt),
      last_login_at: primitives.lastLoginAt ? new Date(primitives.lastLoginAt) : null,
    };
    const pool = {
      async query(): Promise<{ rows: unknown[] }> {
        return { rows: [row] };
      },
    };
    const repo = new PostgresUserRepository(pool as any);

    const found = await repo.search(new UserId(primitives.id));

    expect(found?.id.value).toBe(primitives.id);
    expect(found?.email.value).toBe(primitives.email);
  });

  it('returns null when user is missing', async () => {
    const pool = {
      async query(): Promise<{ rows: unknown[] }> {
        return { rows: [] };
      },
    };
    const repo = new PostgresUserRepository(pool as any);

    const found = await repo.search(new UserId('11111111-1111-1111-1111-111111111111'));

    expect(found).toBeNull();
  });

  it('returns a user by email', async () => {
    const user = buildUser();
    const primitives = user.toPrimitives();
    const row = {
      id: primitives.id,
      name: primitives.name,
      email: primitives.email,
      status: primitives.status,
      password_hash: primitives.passwordHash,
      verification_token: primitives.verificationToken,
      verification_code: primitives.verificationCode ?? primitives.verificationToken,
      verification_token_expires_at: new Date(primitives.verificationTokenExpiresAt),
      verified_at: primitives.verifiedAt ? new Date(primitives.verifiedAt) : null,
      password_reset_token: primitives.passwordResetToken,
      password_reset_token_expires_at: primitives.passwordResetTokenExpiresAt
        ? new Date(primitives.passwordResetTokenExpiresAt)
        : null,
      created_at: new Date(primitives.createdAt),
      updated_at: new Date(primitives.updatedAt),
      last_login_at: primitives.lastLoginAt ? new Date(primitives.lastLoginAt) : null,
    };
    const pool = {
      async query(): Promise<{ rows: unknown[] }> {
        return { rows: [row] };
      },
    };
    const repo = new PostgresUserRepository(pool as any);

    const found = await repo.searchByEmail(new UserEmail(primitives.email));

    expect(found?.id.value).toBe(primitives.id);
    expect(found?.email.value).toBe(primitives.email);
  });
});
