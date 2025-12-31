import 'reflect-metadata';
import { describe, it, expect } from 'bun:test';
import { CreateUserCommandHandler } from '@/contexts/Core/User/application/Create/CreateUserCommandHandler';
import { CreateUserCommand } from '@/contexts/Core/User/application/Create/CreateUserCommand';
import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';
import type { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import { User } from '@/contexts/Core/User/domain/User';

class FakeUserRepository implements UserRepository {
  public saved: User[] = [];

  async save(user: User): Promise<void> {
    this.saved.push(user);
  }

  async search(): Promise<User | null> {
    return null;
  }

  async searchByEmail(): Promise<User | null> {
    return null;
  }
}

class FakeEventBus implements EventBus {
  public published: DomainEvent[] = [];

  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }

  addSubscribers(): void {}
}

describe('CreateUserCommandHandler', () => {
  it('creates a user and publishes events', async () => {
    const repository = new FakeUserRepository();
    const eventBus = new FakeEventBus();
    const handler = new CreateUserCommandHandler(repository, eventBus);

    await handler.handle(
      new CreateUserCommand(
        '11111111-1111-1111-1111-111111111111',
        'Ada Lovelace',
        'ada@example.com',
        'password'
      )
    );

    expect(repository.saved).toHaveLength(1);
    expect(eventBus.published.length).toBeGreaterThan(0);
  });

  it('exposes subscribed command', () => {
    const handler = new CreateUserCommandHandler(new FakeUserRepository(), new FakeEventBus());
    const command = handler.subscribedTo();

    expect(command).toBeInstanceOf(CreateUserCommand);
  });
});
