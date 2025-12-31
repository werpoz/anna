import { describe, it, expect } from 'bun:test';
import { LoginUser } from '@/contexts/Core/Auth/application/use-cases/LoginUser';
import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import type { TokenResult } from '@/contexts/Core/Auth/application/types';
import { InvalidCredentialsError } from '@/contexts/Core/Auth/domain/errors/InvalidCredentialsError';
import { UserNotActiveError } from '@/contexts/Core/User/domain/errors/UserNotActiveError';
import { User } from '@/contexts/Core/User/domain/User';
import { UserPasswordHash } from '@/contexts/Core/User/domain/UserPasswordHash';

class FakeUserRepository implements UserRepository {
  public saved: User[] = [];
  constructor(private user: User | null) {}

  async save(user: User): Promise<void> {
    this.saved.push(user);
  }

  async search(): Promise<User | null> {
    return this.user;
  }

  async searchByEmail(): Promise<User | null> {
    return this.user;
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

const buildUser = async (status: 'active' | 'pending_verification', password: string): Promise<User> => {
  const passwordHash = await Bun.password.hash(password);
  return User.fromPrimitives({
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    status,
    passwordHash,
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

describe('LoginUser', () => {
  it('throws when user does not exist', async () => {
    const useCase = new LoginUser(new FakeUserRepository(null), new FakeTokensService() as any);

    await expect(useCase.execute('ada@example.com', 'password')).rejects.toThrow(InvalidCredentialsError);
  });

  it('throws when user is not active', async () => {
    const user = await buildUser('pending_verification', 'password');
    const useCase = new LoginUser(new FakeUserRepository(user), new FakeTokensService() as any);

    await expect(useCase.execute('ada@example.com', 'password')).rejects.toThrow(UserNotActiveError);
  });

  it('throws when password is invalid', async () => {
    const user = await buildUser('active', 'password');
    const useCase = new LoginUser(new FakeUserRepository(user), new FakeTokensService() as any);

    await expect(useCase.execute('ada@example.com', 'wrong')).rejects.toThrow(InvalidCredentialsError);
  });

  it('issues tokens when login succeeds', async () => {
    const user = await buildUser('active', 'password');
    const repository = new FakeUserRepository(user);
    const tokensService = new FakeTokensService();
    const useCase = new LoginUser(repository, tokensService as any);

    const result = await useCase.execute('ada@example.com', 'password');

    expect(result.accessToken).toBe('access');
    expect(tokensService.issued).toHaveLength(1);
    expect(repository.saved).toHaveLength(1);
    expect(repository.saved[0]?.lastLoginAt).not.toBeNull();
  });
});
