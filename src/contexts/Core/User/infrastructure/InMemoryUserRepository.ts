import type { UserRepository } from '@/contexts/Core/User/domain/UserRepository';
import { User } from '@/contexts/Core/User/domain/User';
import { UserEmail } from '@/contexts/Core/User/domain/UserEmail';
import { UserId } from '@/contexts/Core/User/domain/UserId';
import { injectable } from 'tsyringe';

@injectable()
export class InMemoryUserRepository implements UserRepository {
  private readonly users: Map<string, User>;
  private readonly usersByEmail: Map<string, User>;

  constructor() {
    this.users = new Map();
    this.usersByEmail = new Map();
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id.value, user);
    this.usersByEmail.set(user.email.value, user);
  }

  async search(id: UserId): Promise<User | null> {
    return this.users.get(id.value) ?? null;
  }

  async searchByEmail(email: UserEmail): Promise<User | null> {
    return this.usersByEmail.get(email.value) ?? null;
  }
}
