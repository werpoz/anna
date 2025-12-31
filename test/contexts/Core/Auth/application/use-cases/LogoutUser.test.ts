import { describe, it, expect } from 'bun:test';
import { LogoutUser } from '@/contexts/Core/Auth/application/use-cases/LogoutUser';
import type { RefreshTokenRepository } from '@/contexts/Core/Auth/domain/RefreshTokenRepository';
import type { RefreshTokenHasher } from '@/contexts/Core/Auth/domain/RefreshTokenHasher';

class FakeRefreshTokenRepository implements RefreshTokenRepository {
  public revoked: string[] = [];

  async create(): Promise<void> {}

  async findByTokenHash(): Promise<null> {
    return null;
  }

  async revoke(tokenHash: string): Promise<void> {
    this.revoked.push(tokenHash);
  }

  async revokeAllForUser(): Promise<void> {}
}

class FakeHasher implements RefreshTokenHasher {
  hash(token: string): string {
    return `hash-${token}`;
  }
}

describe('LogoutUser', () => {
  it('revokes refresh token', async () => {
    const repository = new FakeRefreshTokenRepository();
    const useCase = new LogoutUser(repository, new FakeHasher());

    await useCase.execute('refresh-token');

    expect(repository.revoked).toEqual(['hash-refresh-token']);
  });
});
