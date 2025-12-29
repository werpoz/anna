import { User } from '@/contexts/Core/User/domain/User';
import { UserEmail } from '@/contexts/Core/User/domain/UserEmail';
import { UserId } from '@/contexts/Core/User/domain/UserId';

export interface UserRepository {
  save(user: User): Promise<void>;
  search(id: UserId): Promise<User | null>;
  searchByEmail(email: UserEmail): Promise<User | null>;
}
