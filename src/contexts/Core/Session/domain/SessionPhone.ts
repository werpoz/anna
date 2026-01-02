import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';
import { StringValueObject } from '@/contexts/Shared/domain/value-object/StringValueObject';

export class SessionPhone extends StringValueObject {
  constructor(value: string) {
    super(value);
    this.ensureIsValid(value);
  }

  private ensureIsValid(value: string): void {
    if (value.trim().length === 0) {
      throw new InvalidArgumentError(`<${this.constructor.name}> does not allow the value <${value}>`);
    }
  }
}
