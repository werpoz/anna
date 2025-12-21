import { UserId } from '@/contexts/User/domain/UserId';

export class UserDoesNotExistError extends Error {
  constructor(id: UserId) {
    super(`The user <${id.value}> does not exist`);
  }
}
