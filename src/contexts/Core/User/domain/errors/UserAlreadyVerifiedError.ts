import { UserId } from '@/contexts/Core/User/domain/UserId';

export class UserAlreadyVerifiedError extends Error {
  constructor(userId: UserId) {
    super(`User <${userId.value}> is already verified`);
  }
}
