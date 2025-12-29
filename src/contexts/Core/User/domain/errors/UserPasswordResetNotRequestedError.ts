import { UserId } from '@/contexts/Core/User/domain/UserId';

export class UserPasswordResetNotRequestedError extends Error {
  constructor(userId: UserId) {
    super(`Password reset not requested for user <${userId.value}>`);
  }
}
