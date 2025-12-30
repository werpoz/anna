import { describe, it, expect } from 'bun:test';
import { EnumValueObject } from '@/contexts/Shared/domain/value-object/EnumValueObject';
import { InvalidArgumentError } from '@/contexts/Shared/domain/value-object/InvalidArgumentError';

type Status = 'a' | 'b';

class StatusValue extends EnumValueObject<Status> {
  constructor(value: Status) {
    super(value, ['a', 'b']);
  }

  protected throwErrorForInvalidValue(value: Status): void {
    throw new InvalidArgumentError(`invalid ${value}`);
  }
}

describe('EnumValueObject', () => {
  it('accepts valid value', () => {
    expect(new StatusValue('a').value).toBe('a');
  });

  it('rejects invalid value', () => {
    expect(() => new StatusValue('invalid' as Status)).toThrow(InvalidArgumentError);
  });
});
