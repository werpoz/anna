import { UserId } from '@/contexts/Core/User/domain/UserId';
import type { UserStatusValue } from '@/contexts/Core/User/domain/UserStatus';

export class UserVerificationNotPendingError extends Error {
  constructor(userId: UserId, status: UserStatusValue) {
    super(`User <${userId.value}> cannot perform verification (status: ${status})`);
  }
}
