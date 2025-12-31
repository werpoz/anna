import 'reflect-metadata';
import { describe, it, expect } from 'bun:test';
import { FindUserQueryHandler } from '@/contexts/Core/User/application/Find/FindUserQueryHandler';
import { FindUserQuery } from '@/contexts/Core/User/application/Find/FindUserQuery';
import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import { User } from '@/contexts/Core/User/domain/User';
import { UserId } from '@/contexts/Core/User/domain/UserId';
import { UserName } from '@/contexts/Core/User/domain/UserName';
import { UserEmail } from '@/contexts/Core/User/domain/UserEmail';
import { UserPasswordHash } from '@/contexts/Core/User/domain/UserPasswordHash';
import { UserDoesNotExistError } from '@/contexts/Core/User/domain/errors/UserDoesNotExistError';

class FakeUserRepository implements UserRepository {
  constructor(private readonly user: User | null) {}

  async save(): Promise<void> {}

  async search(): Promise<User | null> {
    return this.user;
  }

  async searchByEmail(): Promise<User | null> {
    return null;
  }
}

describe('FindUserQueryHandler', () => {
  it('returns user response when user exists', async () => {
    const user = User.create({
      id: new UserId('11111111-1111-1111-1111-111111111111'),
      name: new UserName('Ada Lovelace'),
      email: new UserEmail('ada@example.com'),
      passwordHash: new UserPasswordHash('hash'),
    });
    const handler = new FindUserQueryHandler(new FakeUserRepository(user));

    const response = await handler.handle(new FindUserQuery(user.id.value));

    expect(response.id).toBe(user.id.value);
    expect(response.email).toBe(user.email.value);
  });

  it('throws when user does not exist', async () => {
    const handler = new FindUserQueryHandler(new FakeUserRepository(null));

    await expect(handler.handle(new FindUserQuery('11111111-1111-1111-1111-111111111111'))).rejects.toThrow(
      UserDoesNotExistError
    );
  });

  it('exposes subscribed query', () => {
    const handler = new FindUserQueryHandler(new FakeUserRepository(null));
    const query = handler.subscribedTo();

    expect(query).toBeInstanceOf(FindUserQuery);
  });
});
