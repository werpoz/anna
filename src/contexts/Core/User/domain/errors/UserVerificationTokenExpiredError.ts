import { UserId } from '@/contexts/Core/User/domain/UserId';

export class UserVerificationTokenExpiredError extends Error {
  constructor(userId: UserId, expiresAt: Date) {
    super(`Verification token for user <${userId.value}> expired at ${expiresAt.toISOString()}`);
  }
}
