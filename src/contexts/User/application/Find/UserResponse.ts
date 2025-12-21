import type { Response } from '@/contexts/Shared/domain/Response';
import { User } from '@/contexts/User/domain/User';

export class UserResponse implements Response {
  readonly id: string;
  readonly name: string;
  readonly email: string;

  constructor(id: string, name: string, email: string) {
    this.id = id;
    this.name = name;
    this.email = email;
  }

  static fromUser(user: User): UserResponse {
    return new UserResponse(user.id.value, user.name.value, user.email.value);
  }
}
