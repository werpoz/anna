import type { UserRepository } from '@/contexts/User/domain/UserRepository';
import { User } from '@/contexts/User/domain/User';
import { UserId } from '@/contexts/User/domain/UserId';
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
