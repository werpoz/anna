import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';
import { ValueObject } from '@/contexts/Shared/domain/value-object/ValueObject';

export class Uuid extends ValueObject<string> {
  constructor(value: string) {
    super(value);
    this.ensureIsValidUuid(value);
  }

  static random(): Uuid {
    return new Uuid(crypto.randomUUID());
  }

  private ensureIsValidUuid(id: string): void {
    if (!Uuid.isValid(id)) {
      throw new InvalidArgumentError(`<${this.constructor.name}> does not allow the value <${id}>`);
    }
  }
  static isValid(id: string) {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
  }
}
