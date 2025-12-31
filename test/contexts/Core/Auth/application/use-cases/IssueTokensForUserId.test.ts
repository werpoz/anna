import { describe, it, expect } from 'bun:test';
import { IssueTokensForUserId } from '@/contexts/Core/Auth/application/use-cases/IssueTokensForUserId';
import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import type { TokenResult } from '@/contexts/Core/Auth/application/types';
import { UserDoesNotExistError } from '@/contexts/Core/User/domain/errors/UserDoesNotExistError';
import { UserNotActiveError } from '@/contexts/Core/User/domain/errors/UserNotActiveError';
import { User } from '@/contexts/Core/User/domain/User';

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
  public issued: Array<{ userId: string; email: string }> = [];

  async issueTokens(userId: string, email: string): Promise<TokenResult> {
    this.issued.push({ userId, email });
    return {
      accessToken: 'access',
      accessTokenExpiresIn: 900,
      refreshToken: 'refresh',
      refreshTokenExpiresIn: 3600,
    };
  }
}

const buildUser = (status: 'active' | 'pending_verification'): User => {
  return User.fromPrimitives({
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    status,
    passwordHash: 'hash',
    verificationToken: '22222222-2222-2222-2222-222222222222',
    verificationCode: '123456',
    verificationTokenExpiresAt: new Date('2024-01-02T00:00:00.000Z').toISOString(),
    verifiedAt: status === 'active' ? new Date('2024-01-01T00:00:00.000Z').toISOString() : null,
    passwordResetToken: null,
    passwordResetTokenExpiresAt: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    lastLoginAt: null,
  });
};

describe('IssueTokensForUserId', () => {
  it('throws when user does not exist', async () => {
    const useCase = new IssueTokensForUserId(new FakeUserRepository(null), new FakeTokensService() as any);

    await expect(useCase.execute('99999999-9999-9999-9999-999999999999')).rejects.toThrow(
      UserDoesNotExistError
    );
  });

  it('throws when user is not active', async () => {
    const user = buildUser('pending_verification');
    const useCase = new IssueTokensForUserId(new FakeUserRepository(user), new FakeTokensService() as any);

    await expect(useCase.execute(user.id.value)).rejects.toThrow(UserNotActiveError);
  });

  it('issues tokens when user is active', async () => {
    const user = buildUser('active');
    const tokensService = new FakeTokensService();
    const useCase = new IssueTokensForUserId(new FakeUserRepository(user), tokensService as any);

    const result = await useCase.execute(user.id.value);

    expect(result.accessToken).toBe('access');
    expect(tokensService.issued).toHaveLength(1);
  });
});
