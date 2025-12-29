import { UserId } from '@/contexts/Core/User/domain/UserId';

export class UserPasswordResetTokenExpiredError extends Error {
  constructor(userId: UserId, expiresAt: Date) {
    super(`Password reset token for user <${userId.value}> expired at ${expiresAt.toISOString()}`);
  }
}
