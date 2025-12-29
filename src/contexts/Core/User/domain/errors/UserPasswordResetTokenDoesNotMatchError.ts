import { UserId } from '@/contexts/Core/User/domain/UserId';

export class UserPasswordResetTokenDoesNotMatchError extends Error {
  constructor(userId: UserId) {
    super(`Password reset token does not match for user <${userId.value}>`);
  }
}
