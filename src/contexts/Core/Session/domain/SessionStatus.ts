import { EnumValueObject } from '@/contexts/Shared/domain/value-object/EnumValueObject';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';

export type SessionStatusValue = 'pending_qr' | 'connected' | 'disconnected' | 'expired';

export class SessionStatus extends EnumValueObject<SessionStatusValue> {
  constructor(value: SessionStatusValue) {
    super(value, ['pending_qr', 'connected', 'disconnected', 'expired']);
  }

  static pendingQr(): SessionStatus {
    return new SessionStatus('pending_qr');
  }

  static connected(): SessionStatus {
    return new SessionStatus('connected');
  }

  static disconnected(): SessionStatus {
    return new SessionStatus('disconnected');
  }

  static expired(): SessionStatus {
    return new SessionStatus('expired');
  }

  protected throwErrorForInvalidValue(value: SessionStatusValue): void {
    throw new InvalidArgumentError(`<${this.constructor.name}> does not allow the value <${value}>`);
  }
}
