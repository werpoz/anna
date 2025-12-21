import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';
import { StringValueObject } from '@/contexts/Shared/domain/value-object/StringValueObject';

export class UserName extends StringValueObject {
  constructor(value: string) {
    super(value);
    this.ensureIsValidName(value);
  }

  private ensureIsValidName(value: string): void {
    if (value.trim().length === 0) {
      throw new InvalidArgumentError(`<${this.constructor.name}> does not allow the value <${value}>`);
    }
  }
}
