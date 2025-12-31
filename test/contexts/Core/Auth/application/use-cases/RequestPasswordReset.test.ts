import { describe, it, expect } from 'bun:test';
import { RequestPasswordReset } from '@/contexts/Core/Auth/application/use-cases/RequestPasswordReset';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';
import type { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import { User } from '@/contexts/Core/User/domain/User';
import { UserId } from '@/contexts/Core/User/domain/UserId';
import { UserName } from '@/contexts/Core/User/domain/UserName';
import { UserEmail } from '@/contexts/Core/User/domain/UserEmail';
import { UserPasswordHash } from '@/contexts/Core/User/domain/UserPasswordHash';

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

const buildActiveUser = (): User => {
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

describe('RequestPasswordReset', () => {
  it('does nothing when user is missing', async () => {
    const eventBus = new FakeEventBus();
    const useCase = new RequestPasswordReset(new FakeUserRepository(null), eventBus, 10 * 60 * 1000);

    await useCase.execute('ada@example.com');

    expect(eventBus.published).toHaveLength(0);
  });

  it('requests password reset for active user', async () => {
    const repository = new FakeUserRepository(buildActiveUser());
    const eventBus = new FakeEventBus();
    const useCase = new RequestPasswordReset(repository, eventBus, 10 * 60 * 1000);

    await useCase.execute('ada@example.com');

    expect(repository.saved).toHaveLength(1);
    expect(repository.saved[0]?.passwordResetToken).not.toBeNull();
    expect(eventBus.published.length).toBeGreaterThan(0);
  });
});
