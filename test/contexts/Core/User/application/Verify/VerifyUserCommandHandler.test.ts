import 'reflect-metadata';
import { describe, it, expect } from 'bun:test';
import { VerifyUserCommandHandler } from '@/contexts/Core/User/application/Verify/VerifyUserCommandHandler';
import { VerifyUserCommand } from '@/contexts/Core/User/application/Verify/VerifyUserCommand';
import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import type { EventBus } from '@/contexts/Shared/domain/EventBus';
import type { DomainEvent } from '@/contexts/Shared/domain/DomainEvent';
import { User } from '@/contexts/Core/User/domain/User';
import { UserId } from '@/contexts/Core/User/domain/UserId';
import { UserName } from '@/contexts/Core/User/domain/UserName';
import { UserEmail } from '@/contexts/Core/User/domain/UserEmail';
import { UserPasswordHash } from '@/contexts/Core/User/domain/UserPasswordHash';
import { UserDoesNotExistError } from '@/contexts/Core/User/domain/errors/UserDoesNotExistError';

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

describe('VerifyUserCommandHandler', () => {
  it('verifies user and publishes events', async () => {
    const user = User.create({
      id: new UserId('11111111-1111-1111-1111-111111111111'),
      name: new UserName('Ada Lovelace'),
      email: new UserEmail('ada@example.com'),
      passwordHash: new UserPasswordHash('hash'),
    });
    const repository = new FakeUserRepository(user);
    const eventBus = new FakeEventBus();
    const handler = new VerifyUserCommandHandler(repository, eventBus);

    await handler.handle(new VerifyUserCommand(user.id.value, user.verificationToken.value));

    expect(repository.saved).toHaveLength(1);
    expect(eventBus.published.length).toBeGreaterThan(0);
  });

  it('throws when user is missing', async () => {
    const handler = new VerifyUserCommandHandler(new FakeUserRepository(null), new FakeEventBus());

    await expect(handler.handle(new VerifyUserCommand('11111111-1111-1111-1111-111111111111', 'token'))).rejects.toThrow(
      UserDoesNotExistError
    );
  });

  it('exposes subscribed command', () => {
    const handler = new VerifyUserCommandHandler(new FakeUserRepository(null), new FakeEventBus());
    const command = handler.subscribedTo();

    expect(command).toBeInstanceOf(VerifyUserCommand);
  });
});
