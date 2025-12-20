import type { UserRepository } from '../domain/UserRepository';
import { User } from '../domain/User';
import { UserId } from '../domain/UserId';
import { injectable } from 'tsyringe';

@injectable()
export class InMemoryUserRepository implements UserRepository {
  private readonly users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id.value, user);
  }

  async search(id: UserId): Promise<User | null> {
    return this.users.get(id.value) ?? null;
  }
}
