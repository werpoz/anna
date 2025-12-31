import { describe, it, expect } from 'bun:test';
import { RefreshSession } from '@/contexts/Core/Auth/application/use-cases/RefreshSession';
import type { RefreshTokenRepository, RefreshTokenRecord } from '@/contexts/Core/Auth/domain/RefreshTokenRepository';
import type { RefreshTokenHasher } from '@/contexts/Core/Auth/domain/RefreshTokenHasher';
import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import type { TokenResult } from '@/contexts/Core/Auth/application/types';
import { InvalidRefreshTokenError } from '@/contexts/Core/Auth/domain/errors/InvalidRefreshTokenError';
import { User } from '@/contexts/Core/User/domain/User';

class FakeRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private record: RefreshTokenRecord | null) {}

  async create(): Promise<void> {}

  async findByTokenHash(): Promise<RefreshTokenRecord | null> {
    return this.record;
  }

  async revoke(): Promise<void> {}

  async revokeAllForUser(): Promise<void> {}
}

class FakeHasher implements RefreshTokenHasher {
  hash(token: string): string {
    return `hash-${token}`;
  }
}

class FakeUserRepository implements UserRepository {
  constructor(private user: User | null) {}

  async save(): Promise<void> {}

  async search(): Promise<User | null> {
    return this.user;
  }

  async searchByEmail(): Promise<User | null> {
    return null;
  }
}

class FakeTokensService {
  public rotated: Array<{ tokenHash: string }> = [];

  async rotateRefreshToken(
    stored: { tokenHash: string },
    _metadata: unknown,
    userId: string,
    email: string
  ): Promise<TokenResult> {
    this.rotated.push(stored);
    return {
      accessToken: `access-${userId}-${email}`,
      accessTokenExpiresIn: 900,
      refreshToken: 'refresh',
      refreshTokenExpiresIn: 3600,
    };
  }
}

const buildUser = (): User => {
  return User.fromPrimitives({
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    status: 'active',
    passwordHash: 'hash',
    verificationToken: '22222222-2222-2222-2222-222222222222',
    verificationCode: '123456',
    verificationTokenExpiresAt: new Date('2024-01-02T00:00:00.000Z').toISOString(),
    verifiedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    passwordResetToken: null,
    passwordResetTokenExpiresAt: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    lastLoginAt: null,
  });
};

describe('RefreshSession', () => {
  it('throws when refresh token is missing', async () => {
    const useCase = new RefreshSession(
      new FakeRefreshTokenRepository(null),
      new FakeHasher(),
      new FakeUserRepository(buildUser()),
      new FakeTokensService() as any
    );

    await expect(useCase.execute('token')).rejects.toThrow(InvalidRefreshTokenError);
  });

  it('throws when refresh token is revoked', async () => {
    const record: RefreshTokenRecord = {
      tokenHash: 'hash-token',
      userId: '11111111-1111-1111-1111-111111111111',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      expiresAt: new Date('2024-02-01T00:00:00.000Z'),
      revokedAt: new Date('2024-01-02T00:00:00.000Z'),
      replacedByTokenHash: null,
    };
    const useCase = new RefreshSession(
      new FakeRefreshTokenRepository(record),
      new FakeHasher(),
      new FakeUserRepository(buildUser()),
      new FakeTokensService() as any
    );

    await expect(useCase.execute('token')).rejects.toThrow(InvalidRefreshTokenError);
  });

  it('throws when refresh token is expired', async () => {
    const record: RefreshTokenRecord = {
      tokenHash: 'hash-token',
      userId: '11111111-1111-1111-1111-111111111111',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      expiresAt: new Date('2024-01-01T00:00:00.000Z'),
      revokedAt: null,
      replacedByTokenHash: null,
    };
    const useCase = new RefreshSession(
      new FakeRefreshTokenRepository(record),
      new FakeHasher(),
      new FakeUserRepository(buildUser()),
      new FakeTokensService() as any
    );

    await expect(useCase.execute('token')).rejects.toThrow(InvalidRefreshTokenError);
  });

  it('throws when user is missing', async () => {
    const record: RefreshTokenRecord = {
      tokenHash: 'hash-token',
      userId: '11111111-1111-1111-1111-111111111111',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      expiresAt: new Date('2025-01-01T00:00:00.000Z'),
      revokedAt: null,
      replacedByTokenHash: null,
    };
    const useCase = new RefreshSession(
      new FakeRefreshTokenRepository(record),
      new FakeHasher(),
      new FakeUserRepository(null),
      new FakeTokensService() as any
    );

    await expect(useCase.execute('token')).rejects.toThrow(InvalidRefreshTokenError);
  });

  it('rotates refresh token when valid', async () => {
    const record: RefreshTokenRecord = {
      tokenHash: 'hash-token',
      userId: '11111111-1111-1111-1111-111111111111',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      revokedAt: null,
      replacedByTokenHash: null,
    };
    const tokensService = new FakeTokensService();
    const useCase = new RefreshSession(
      new FakeRefreshTokenRepository(record),
      new FakeHasher(),
      new FakeUserRepository(buildUser()),
      tokensService as any
    );

    const result = await useCase.execute('token');

    expect(result.refreshToken).toBe('refresh');
    expect(tokensService.rotated).toHaveLength(1);
  });
});
