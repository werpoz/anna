import { UserId } from '@/contexts/Core/User/domain/UserId';

export class UserVerificationTokenDoesNotMatchError extends Error {
  constructor(userId: UserId) {
    super(`Verification token does not match for user <${userId.value}>`);
  }
}
