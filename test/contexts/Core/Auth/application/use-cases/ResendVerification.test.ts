import { describe, it, expect } from 'bun:test';
import { ResendVerification } from '@/contexts/Core/Auth/application/use-cases/ResendVerification';
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

describe('ResendVerification', () => {
  it('does nothing when user is missing', async () => {
    const eventBus = new FakeEventBus();
    const useCase = new ResendVerification(new FakeUserRepository(null), eventBus);

    await useCase.execute('ada@example.com');

    expect(eventBus.published).toHaveLength(0);
  });

  it('resends verification token for pending user', async () => {
    const user = User.create({
      id: new UserId('11111111-1111-1111-1111-111111111111'),
      name: new UserName('Ada Lovelace'),
      email: new UserEmail('ada@example.com'),
      passwordHash: new UserPasswordHash('hash'),
    });
    user.pullDomainEvents();

    const repository = new FakeUserRepository(user);
    const eventBus = new FakeEventBus();
    const useCase = new ResendVerification(repository, eventBus);

    await useCase.execute('ada@example.com');

    expect(repository.saved).toHaveLength(1);
    expect(eventBus.published.length).toBeGreaterThan(0);
  });
});
