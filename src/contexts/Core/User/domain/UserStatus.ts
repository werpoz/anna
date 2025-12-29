import { EnumValueObject } from '@/contexts/Shared/domain/value-object/EnumValueObject';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';

export type UserStatusValue = 'pending_verification' | 'active' | 'invited' | 'suspended' | 'deleted';

export class UserStatus extends EnumValueObject<UserStatusValue> {
  constructor(value: UserStatusValue) {
    super(value, ['pending_verification', 'active', 'invited', 'suspended', 'deleted']);
  }

  static pendingVerification(): UserStatus {
    return new UserStatus('pending_verification');
  }

  static active(): UserStatus {
    return new UserStatus('active');
  }

  static invited(): UserStatus {
    return new UserStatus('invited');
  }

  static suspended(): UserStatus {
    return new UserStatus('suspended');
  }

  static deleted(): UserStatus {
    return new UserStatus('deleted');
  }

  protected throwErrorForInvalidValue(value: UserStatusValue): void {
    throw new InvalidArgumentError(`<${this.constructor.name}> does not allow the value <${value}>`);
  }
}
