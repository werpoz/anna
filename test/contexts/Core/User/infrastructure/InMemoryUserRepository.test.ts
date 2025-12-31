import 'reflect-metadata';
import { describe, it, expect } from 'bun:test';
import { InMemoryUserRepository } from '@/contexts/Core/User/infrastructure/InMemoryUserRepository';
import { User } from '@/contexts/Core/User/domain/User';
import { UserId } from '@/contexts/Core/User/domain/UserId';
import { UserName } from '@/contexts/Core/User/domain/UserName';
import { UserEmail } from '@/contexts/Core/User/domain/UserEmail';
import { UserPasswordHash } from '@/contexts/Core/User/domain/UserPasswordHash';


describe('InMemoryUserRepository', () => {
  it('saves and retrieves users by id and email', async () => {
    const repository = new InMemoryUserRepository();
    const user = User.create({
      id: new UserId('11111111-1111-1111-1111-111111111111'),
      name: new UserName('Ada Lovelace'),
      email: new UserEmail('ada@example.com'),
      passwordHash: new UserPasswordHash('hash'),
    });

    await repository.save(user);

    const byId = await repository.search(new UserId('11111111-1111-1111-1111-111111111111'));
    const byEmail = await repository.searchByEmail(new UserEmail('ada@example.com'));

    expect(byId?.id.value).toBe(user.id.value);
    expect(byEmail?.email.value).toBe(user.email.value);
  });
});
