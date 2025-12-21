import { User } from '@/contexts/User/domain/User';
import { UserId } from '@/contexts/User/domain/UserId';

export interface UserRepository {
  save(user: User): Promise<void>;
  search(id: UserId): Promise<User | null>;
}
