import { describe, it, expect } from 'bun:test';
import { AuthTokensService } from '@/contexts/Core/Auth/application/services/AuthTokensService';
import type { RefreshTokenRepository, RefreshTokenRecord } from '@/contexts/Core/Auth/domain/RefreshTokenRepository';
import type { AccessTokenSigner } from '@/contexts/Core/Auth/domain/AccessTokenSigner';
import type { RefreshTokenHasher } from '@/contexts/Core/Auth/domain/RefreshTokenHasher';
import type { RefreshTokenGenerator } from '@/contexts/Core/Auth/domain/RefreshTokenGenerator';

class FakeRefreshTokenRepository implements RefreshTokenRepository {
  public created: RefreshTokenRecord[] = [];
  public revoked: Array<{ tokenHash: string; replacedByTokenHash?: string }> = [];

  async create(record: RefreshTokenRecord): Promise<void> {
    this.created.push(record);
  }

  async findByTokenHash(): Promise<RefreshTokenRecord | null> {
    return null;
  }

  async revoke(tokenHash: string, replacedByTokenHash?: string): Promise<void> {
    this.revoked.push({ tokenHash, replacedByTokenHash });
  }

  async revokeAllForUser(): Promise<void> {}
}

class FakeAccessTokenSigner implements AccessTokenSigner {
  async sign(userId: string, email: string, expiresInSeconds: number): Promise<string> {
    return `access-${userId}-${email}-${expiresInSeconds}`;
  }
}

class FakeRefreshTokenHasher implements RefreshTokenHasher {
  hash(token: string): string {
    return `hash-${token}`;
  }
}

class FakeRefreshTokenGenerator implements RefreshTokenGenerator {
  private readonly tokens: string[];

  constructor(tokens: string[]) {
    this.tokens = tokens;
  }

  generate(): string {
    return this.tokens.shift() ?? 'refresh-default';
  }
}

describe('AuthTokensService', () => {
  it('issues tokens and stores refresh record', async () => {
    const repository = new FakeRefreshTokenRepository();
    const service = new AuthTokensService(
      repository,
      new FakeAccessTokenSigner(),
      new FakeRefreshTokenHasher(),
      new FakeRefreshTokenGenerator(['refresh-1']),
      15 * 60 * 1000,
      30 * 24 * 60 * 60 * 1000
    );

    const result = await service.issueTokens('user-1', 'ada@example.com', { userAgent: 'ua', ip: 'ip' });

    expect(result.refreshToken).toBe('refresh-1');
    expect(result.accessToken).toContain('user-1');
    expect(result.accessTokenExpiresIn).toBe(900);
    expect(result.refreshTokenExpiresIn).toBe(30 * 24 * 60 * 60);
    expect(repository.created).toHaveLength(1);
    const created = repository.created[0]!;
    expect(created.tokenHash).toBe('hash-refresh-1');
    expect(created.userAgent).toBe('ua');
    expect(created.ip).toBe('ip');
  });

  it('rotates refresh tokens and revokes previous one', async () => {
    const repository = new FakeRefreshTokenRepository();
    const service = new AuthTokensService(
      repository,
      new FakeAccessTokenSigner(),
      new FakeRefreshTokenHasher(),
      new FakeRefreshTokenGenerator(['refresh-2']),
      15 * 60 * 1000,
      30 * 24 * 60 * 60 * 1000
    );

    const result = await service.rotateRefreshToken({ tokenHash: 'old-hash' }, {}, 'user-1', 'ada@example.com');

    expect(repository.revoked[0]).toEqual({ tokenHash: 'old-hash', replacedByTokenHash: 'hash-refresh-2' });
    expect(repository.created[0]?.tokenHash).toBe('hash-refresh-2');
    expect(result.refreshToken).toBe('refresh-2');
  });
});
