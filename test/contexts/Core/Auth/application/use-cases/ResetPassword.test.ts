import { describe, it, expect } from 'bun:test';
import { ResetPassword } from '@/contexts/Core/Auth/application/use-cases/ResetPassword';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';
import type { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import { InvalidCredentialsError } from '@/contexts/Core/Auth/domain/errors/InvalidCredentialsError';
import { User } from '@/contexts/Core/User/domain/User';

class FakeEventBus implements EventBus {
  public published: DomainEvent[] = [];

  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }

  addSubscribers(): void {}
}

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

const buildActiveUserWithResetToken = (): User => {
  const user = User.fromPrimitives({
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

  user.requestPasswordReset(10 * 60 * 1000);
  user.pullDomainEvents();
  return user;
};

describe('ResetPassword', () => {
  it('throws when user does not exist', async () => {
    const useCase = new ResetPassword(new FakeUserRepository(null), new FakeEventBus());

    await expect(useCase.execute('ada@example.com', 'token', 'new-password')).rejects.toThrow(
      InvalidCredentialsError
    );
  });

  it('resets password and publishes events', async () => {
    const user = buildActiveUserWithResetToken();
    const repository = new FakeUserRepository(user);
    const eventBus = new FakeEventBus();
    const useCase = new ResetPassword(repository, eventBus);

    const token = user.passwordResetToken?.value ?? '';
    await useCase.execute('ada@example.com', token, 'new-password');

    expect(repository.saved).toHaveLength(1);
    expect(repository.saved[0]?.passwordResetToken).toBeNull();
    expect(eventBus.published.length).toBeGreaterThan(0);
  });
});
